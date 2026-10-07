import React, {
  useState,
  useRef,
  useEffect,
} from 'react';

import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useToast } from '../context/useToast';

import type { FileMetadata } from '../types';
import type { AiAction } from '../services/ai';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import {
  Sparkles,
  FileText,
  ListFilter,
  HelpCircle,
  Send,
  Copy,
  Check,
  AlertCircle,
  FileCheck,
  RefreshCw,
  History,
  MessageSquare,
} from 'lucide-react';

import {
  formatBytes,
  truncateFileName,
} from '../utils/formatters';

interface DocumentAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileMetadata | null;
}

/*
 * Backend AiHistory structure.
 */
interface AiHistoryItem {
  id: number;
  fileId: number;
  username: string;
  action: string;
  question: string | null;
  response: string;
  createdAt: string;
}

/*
 * UI tab.
 *
 * AI_ACTION represents Summary / Notes / Question.
 * HISTORY represents the persistent history screen.
 */
type ActiveView =
    | AiAction
    | 'HISTORY';

const AI_TIMEOUT_MS =
    5 * 60 * 1000;

const AI_ENDPOINT =
    'http://localhost:8080/api/ai/documents';

export const DocumentAiModal: React.FC<
    DocumentAiModalProps
> = ({
       isOpen,
       onClose,
       file,
     }) => {
  const { toast } = useToast();

  /*
   * Current selected view.
   */
  const [activeView, setActiveView] =
      useState<ActiveView>('SUMMARY');

  /*
   * Question input.
   */
  const [question, setQuestion] =
      useState('');

  /*
   * Currently displayed response.
   */
  const [response, setResponse] =
      useState<string | null>(null);

  /*
   * Last generated action.
   */
  const [lastAction, setLastAction] =
      useState<AiAction | null>(null);

  /*
   * Last question asked.
   */
  const [lastQuestion, setLastQuestion] =
      useState('');

  /*
   * Loading state.
   */
  const [isLoading, setIsLoading] =
      useState(false);

  /*
   * Error message.
   */
  const [error, setError] =
      useState<string | null>(null);

  /*
   * Copy state.
   */
  const [copied, setCopied] =
      useState(false);

  /*
   * Local cache for currently loaded
   * Summary / Detailed Notes.
   *
   * This prevents unnecessary requests
   * while the modal remains open.
   */
  const [cachedResponses, setCachedResponses] =
      useState<
          Partial<Record<AiAction, string>>
      >({});

  /*
   * Persistent history loaded from PostgreSQL.
   */
  const [history, setHistory] =
      useState<AiHistoryItem[]>([]);

  /*
   * History loading state.
   */
  const [isHistoryLoading, setIsHistoryLoading] =
      useState(false);

  /*
   * Currently selected history item.
   */
  const [selectedHistoryId, setSelectedHistoryId] =
      useState<number | null>(null);

  /*
   * Request control.
   */
  const requestIdRef =
      useRef(0);

  const abortControllerRef =
      useRef<AbortController | null>(null);

  /*
   * Auto-scroll response area.
   */
  const responseScrollRef =
      useRef<HTMLDivElement | null>(null);

  /*
   * Complete streamed response.
   *
   * This is used for caching and history
   * handling after streaming completes.
   */
  const fullResponseRef =
      useRef('');

  /*
   * ==========================================
   * LOAD HISTORY
   * ==========================================
   */
  const loadHistory = async (
      fileId: number | string
  ) => {
    try {
      setIsHistoryLoading(true);

      const token =
          localStorage.getItem('token');

      const headers: Record<string, string> = {};

      if (token) {
        headers.Authorization =
            `Bearer ${token}`;
      }

      const res = await fetch(
          `${AI_ENDPOINT}/${fileId}/history`,
          {
            method: 'GET',
            headers,
          }
      );

      if (!res.ok) {
        throw new Error(
            `Failed to load AI history (${res.status})`
        );
      }

      const data =
          (await res.json()) as AiHistoryItem[];

      setHistory(data);

      /*
       * Find the newest Summary.
       */
      const latestSummary =
          data.find(
              (item) =>
                  item.action === 'SUMMARY'
          );

      /*
       * Find the newest Detailed Notes.
       */
      const latestNotes =
          data.find(
              (item) =>
                  item.action === 'DETAILED_NOTES'
          );

      /*
       * Restore cached Summary / Notes
       * from PostgreSQL.
       */
      const restoredCache:
          Partial<Record<AiAction, string>> =
          {};

      if (latestSummary) {
        restoredCache.SUMMARY =
            latestSummary.response;
      }

      if (latestNotes) {
        restoredCache.DETAILED_NOTES =
            latestNotes.response;
      }

      setCachedResponses(
          restoredCache
      );

      /*
       * When opening the document, show the
       * latest Summary automatically if one exists.
       */
      if (latestSummary) {
        setResponse(
            latestSummary.response
        );

        setLastAction('SUMMARY');
      } else {
        setResponse(null);
        setLastAction(null);
      }

    } catch (err) {
      console.error(
          'Failed to load AI history:',
          err
      );

      setHistory([]);
      setCachedResponses({});
    } finally {
      setIsHistoryLoading(false);
    }
  };

  /*
   * ==========================================
   * LOAD HISTORY WHEN MODAL OPENS
   * ==========================================
   */
  useEffect(() => {
    if (
        isOpen &&
        file?.id
    ) {
      /*
       * Reset UI for the new document.
       */
      setActiveView('SUMMARY');
      setQuestion('');
      setError(null);
      setCopied(false);
      setSelectedHistoryId(null);

      /*
       * Load persistent history.
       */
      loadHistory(file.id);
    }
  }, [
    isOpen,
    file?.id,
  ]);

  /*
   * ==========================================
   * AUTO SCROLL
   * ==========================================
   */
  useEffect(() => {
    if (
        isLoading &&
        responseScrollRef.current
    ) {
      responseScrollRef.current.scrollTop =
          responseScrollRef.current.scrollHeight;
    }
  }, [
    response,
    isLoading,
  ]);

  /*
   * ==========================================
   * ABORT ON UNMOUNT
   * ==========================================
   */
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, []);

  /*
   * ==========================================
   * CLOSE MODAL
   * ==========================================
   */
  const handleClose = () => {
    requestIdRef.current += 1;

    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    setIsLoading(false);
    setResponse(null);
    setError(null);
    setQuestion('');
    setLastQuestion('');
    setLastAction(null);
    setActiveView('SUMMARY');
    setCopied(false);
    setCachedResponses({});
    setHistory([]);
    setSelectedHistoryId(null);

    fullResponseRef.current = '';

    onClose();
  };

  /*
   * ==========================================
   * EXECUTE AI
   * ==========================================
   */
  const handleExecute = async (
      actionToRun: AiAction = 'SUMMARY',
      forceRefresh = false
  ) => {
    if (
        !file ||
        isLoading
    ) {
      return;
    }

    const trimmedQuestion =
        question.trim();

    /*
     * Validate question.
     */
    if (
        actionToRun === 'QUESTION' &&
        !trimmedQuestion
    ) {
      setError(
          'Please enter a specific question about this document.'
      );

      return;
    }

    /*
     * Use cached Summary / Notes when available.
     *
     * forceRefresh bypasses this.
     */
    if (
        !forceRefresh &&
        actionToRun !== 'QUESTION' &&
        cachedResponses[actionToRun]
    ) {
      setActiveView(
          actionToRun
      );

      setLastAction(
          actionToRun
      );

      setResponse(
          cachedResponses[actionToRun] ?? null
      );

      setError(null);
      setCopied(false);

      return;
    }

    const currentRequestId =
        ++requestIdRef.current;

    const controller =
        new AbortController();

    abortControllerRef.current =
        controller;

    let timedOut = false;

    const timeoutId =
        window.setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, AI_TIMEOUT_MS);

    /*
     * Reset streamed response.
     */
    fullResponseRef.current =
        '';

    setActiveView(
        actionToRun
    );

    setIsLoading(true);
    setError(null);
    setResponse(null);
    setCopied(false);

    setLastAction(
        actionToRun
    );

    setLastQuestion(
        actionToRun === 'QUESTION'
            ? trimmedQuestion
            : ''
    );

    try {
      const payload =
          actionToRun === 'QUESTION'
              ? {
                action: 'QUESTION',
                question: trimmedQuestion,
              }
              : {
                action: actionToRun,
              };

      const token =
          localStorage.getItem('token');

      const headers: Record<string, string> = {
        'Content-Type':
            'application/json',

        Accept:
            'text/plain, text/event-stream, application/json',
      };

      if (token) {
        headers.Authorization =
            `Bearer ${token}`;
      }

      const res = await fetch(
          `${AI_ENDPOINT}/${file.id}`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(
                payload
            ),
            signal:
            controller.signal,
          }
      );

      if (
          currentRequestId !==
          requestIdRef.current
      ) {
        return;
      }

      /*
       * Handle HTTP errors.
       */
      if (!res.ok) {
        const errorText =
            await res.text()
                .catch(() => '');

        let serverMessage = '';

        if (
            errorText.trim()
        ) {
          try {
            const parsed =
                JSON.parse(
                    errorText
                ) as {
                  message?: unknown;
                };

            serverMessage =
                typeof parsed?.message ===
                'string' &&
                parsed.message.trim()
                    ? parsed.message
                    : errorText;

          } catch {
            serverMessage =
                errorText;
          }
        }

        throw new Error(
            serverMessage ||
            `Request failed with status ${res.status}.`
        );
      }

      let received = false;

      /*
       * Append streamed text.
       */
      const appendText = (
          text: string
      ) => {
        if (!text) {
          return;
        }

        received = true;

        fullResponseRef.current +=
            text;

        setResponse(
            fullResponseRef.current
        );
      };

      /*
       * ======================================
       * NON-STREAMING FALLBACK
       * ======================================
       */
      if (!res.body) {
        const fullText =
            await res.text();

        if (
            currentRequestId !==
            requestIdRef.current
        ) {
          return;
        }

        if (
            fullText.trim()
        ) {
          appendText(
              fullText
          );
        }

      } else {

        /*
         * ====================================
         * SSE STREAM
         * ====================================
         */

        const reader =
            res.body.getReader();

        const decoder =
            new TextDecoder(
                'utf-8'
            );

        let buffer = '';

        while (true) {
          const {
            done,
            value,
          } =
              await reader.read();

          if (
              currentRequestId !==
              requestIdRef.current
          ) {
            reader
                .cancel()
                .catch(() => {});

            return;
          }

          if (done) {
            break;
          }

          buffer +=
              decoder.decode(
                  value,
                  {
                    stream: true,
                  }
              );

          /*
           * SSE events are separated
           * by a blank line.
           */
          const events =
              buffer.split(
                  /\r?\n\r?\n/
              );

          /*
           * Keep incomplete event.
           */
          buffer =
              events.pop() || '';

          for (
              const event of events
              ) {
            const lines =
                event.split(
                    /\r?\n/
                );

            const dataLines =
                lines
                    .filter(
                        (line) =>
                            line.startsWith(
                                'data:'
                            )
                    )
                    .map(
                        (line) =>
                            line.substring(5)
                    );

            if (
                dataLines.length > 0
            ) {
              const text =
                  dataLines.join(
                      '\n'
                  );

              appendText(
                  text
              );
            }
          }
        }

        /*
         * Flush decoder.
         */
        buffer +=
            decoder.decode();

        /*
         * Process final event.
         */
        if (
            buffer.trim()
        ) {
          const dataLines =
              buffer
                  .split(
                      /\r?\n/
                  )
                  .filter(
                      (line) =>
                          line.startsWith(
                              'data:'
                          )
                  )
                  .map(
                      (line) =>
                          line.substring(5)
                  );

          if (
              dataLines.length > 0
          ) {
            const text =
                dataLines.join(
                    '\n'
                );

            appendText(
                text
            );
          }
        }
      }

      if (
          currentRequestId !==
          requestIdRef.current
      ) {
        return;
      }

      /*
       * Empty response.
       */
      if (!received) {
        const emptyMessage =
            'The model returned an empty response. Please try rephrasing.';

        fullResponseRef.current =
            emptyMessage;

        setResponse(
            emptyMessage
        );
      }

      /*
       * ======================================
       * SAVE / UPDATE LOCAL CACHE
       * ======================================
       */
      if (
          actionToRun !==
          'QUESTION' &&
          fullResponseRef.current
      ) {
        setCachedResponses(
            (prev) => ({
              ...prev,
              [actionToRun]:
              fullResponseRef.current,
            })
        );
      }

      /*
       * ======================================
       * REFRESH HISTORY FROM DATABASE
       * ======================================
       *
       * Backend saves the response when
       * the stream completes.
       */
      if (
          fullResponseRef.current
      ) {
        await loadHistory(
            file.id
        );
      }

    } catch (
        err: unknown
        ) {
      if (
          currentRequestId !==
          requestIdRef.current
      ) {
        return;
      }

      const isAbort =
          err instanceof DOMException &&
          err.name ===
          'AbortError';

      /*
       * User intentionally cancelled.
       */
      if (
          isAbort &&
          !timedOut
      ) {
        return;
      }

      let message =
          'AI analysis could not be completed. Please try again.';

      if (timedOut) {
        message =
            'The AI model took too long to analyze this document. Please try again shortly.';

      } else if (
          err instanceof Error &&
          err.message.trim() &&
          !(err instanceof TypeError)
      ) {
        message =
            err.message;
      }

      setError(
          message
      );

    } finally {

      window.clearTimeout(
          timeoutId
      );

      if (
          abortControllerRef.current ===
          controller
      ) {
        abortControllerRef.current =
            null;
      }

      if (
          currentRequestId ===
          requestIdRef.current
      ) {
        setIsLoading(false);
      }
    }
  };

  /*
   * ==========================================
   * CHANGE MAIN AI TAB
   * ==========================================
   */
  const handleTabChange = (
      action: AiAction
  ) => {
    if (isLoading) {
      return;
    }

    setActiveView(
        action
    );

    setError(null);
    setCopied(false);
    setSelectedHistoryId(null);

    /*
     * Question tab.
     */
    if (
        action === 'QUESTION'
    ) {
      setResponse(null);
      setLastAction(null);
      setLastQuestion('');

      return;
    }

    /*
     * Show cached Summary / Notes.
     */
    const cached =
        cachedResponses[action];

    if (cached) {
      setResponse(
          cached
      );

      setLastAction(
          action
      );

      return;
    }

    /*
     * No cached response.
     *
     * Generate it.
     */
    handleExecute(
        action
    );
  };

  /*
   * ==========================================
   * REFRESH
   * ==========================================
   */
  const handleRefresh = () => {
    if (
        isLoading ||
        activeView === 'QUESTION' ||
        activeView === 'HISTORY'
    ) {
      return;
    }

    handleExecute(
        activeView,
        true
    );
  };

  /*
   * ==========================================
   * HISTORY ITEM CLICK
   * ==========================================
   */
  const handleHistoryClick = (
      item: AiHistoryItem
  ) => {
    setSelectedHistoryId(
        item.id
    );

    setResponse(
        item.response
    );

    setLastAction(
        item.action as AiAction
    );

    setLastQuestion(
        item.question || ''
    );

    setActiveView(
        item.action as AiAction
    );

    setError(null);
    setCopied(false);
  };

  /*
   * ==========================================
   * COPY
   * ==========================================
   */
  const handleCopyResponse =
      async () => {
        if (!response) {
          return;
        }

        try {
          await navigator.clipboard.writeText(
              response
          );

          setCopied(true);

          toast.success(
              'AI output copied to clipboard'
          );

          setTimeout(
              () =>
                  setCopied(false),
              2000
          );

        } catch {
          toast.error(
              'Failed to copy to clipboard'
          );
        }
      };

  /*
   * ==========================================
   * DATE FORMAT
   * ==========================================
   */
  const formatHistoryDate = (
      date: string
  ) => {
    try {
      return new Date(
          date
      ).toLocaleString(
          undefined,
          {
            dateStyle: 'medium',
            timeStyle: 'short',
          }
      );
    } catch {
      return date;
    }
  };

  if (!file) {
    return null;
  }

  const showStartingIndicator =
      isLoading &&
      !response;

  const showResponsePanel =
      !!response &&
      activeView !== 'HISTORY';

  /*
   * ==========================================
   * RENDER
   * ==========================================
   */
  return (
      <Modal
          isOpen={isOpen}
          onClose={handleClose}
          maxWidth="2xl"
          title={
            <div className="flex items-center gap-2.5">

              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 flex items-center justify-center shrink-0">

                <Sparkles
                    className="w-4 h-4"
                    aria-hidden="true"
                />

              </div>

              <div className="min-w-0">

            <span className="font-semibold text-slate-100">
              Document Intelligence
            </span>

                <div className="flex items-center gap-2 text-xs text-slate-400 font-normal">

              <span className="truncate max-w-[260px] sm:max-w-md">
                {truncateFileName(
                    file.fileName,
                    38
                )}
              </span>

                  <span>•</span>

                  <span>
                {formatBytes(
                    file.fileSize
                )}
              </span>

                </div>
              </div>
            </div>
          }
          description="Extract key insights, generate comprehensive study notes, or query document content using semantic RAG retrieval."
      >

        <div className="space-y-5">

          {/* ================================= */}
          {/* TABS */}
          {/* ================================= */}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">

            {/* SUMMARY */}
            <button
                type="button"
                onClick={() =>
                    handleTabChange(
                        'SUMMARY'
                    )
                }
                disabled={isLoading}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    activeView === 'SUMMARY'
                        ? 'bg-indigo-500/10 border-indigo-500/40 text-slate-100'
                        : 'bg-[#101420] border-white/5 hover:border-white/15 text-slate-300'
                }`}
            >

              <div className="flex items-center justify-between">

                <FileText
                    className={`w-4 h-4 ${
                        activeView === 'SUMMARY'
                            ? 'text-indigo-400'
                            : 'text-slate-400'
                    }`}
                />

                {cachedResponses.SUMMARY && (
                    <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                )}

              </div>

              <div>

                <p className="text-xs font-semibold text-slate-200">
                  Executive Summary
                </p>

                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                  Key takeaways and core findings
                </p>

              </div>

            </button>

            {/* DETAILED NOTES */}
            <button
                type="button"
                onClick={() =>
                    handleTabChange(
                        'DETAILED_NOTES'
                    )
                }
                disabled={isLoading}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    activeView === 'DETAILED_NOTES'
                        ? 'bg-indigo-500/10 border-indigo-500/40 text-slate-100'
                        : 'bg-[#101420] border-white/5 hover:border-white/15 text-slate-300'
                }`}
            >

              <div className="flex items-center justify-between">

                <ListFilter
                    className={`w-4 h-4 ${
                        activeView === 'DETAILED_NOTES'
                            ? 'text-indigo-400'
                            : 'text-slate-400'
                    }`}
                />

                {cachedResponses.DETAILED_NOTES && (
                    <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                )}

              </div>

              <div>

                <p className="text-xs font-semibold text-slate-200">
                  Detailed Notes
                </p>

                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                  Structured analysis by section
                </p>

              </div>

            </button>

            {/* QUESTION */}
            <button
                type="button"
                onClick={() =>
                    handleTabChange(
                        'QUESTION'
                    )
                }
                disabled={isLoading}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    activeView === 'QUESTION'
                        ? 'bg-indigo-500/10 border-indigo-500/40 text-slate-100'
                        : 'bg-[#101420] border-white/5 hover:border-white/15 text-slate-300'
                }`}
            >

              <div className="flex items-center justify-between">

                <HelpCircle
                    className={`w-4 h-4 ${
                        activeView === 'QUESTION'
                            ? 'text-indigo-400'
                            : 'text-slate-400'
                    }`}
                />

                {lastAction === 'QUESTION' &&
                    response &&
                    !isLoading && (
                        <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                    )}

              </div>

              <div>

                <p className="text-xs font-semibold text-slate-200">
                  Ask Document
                </p>

                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                  Direct questions with RAG answers
                </p>

              </div>

            </button>

            {/* HISTORY */}
            <button
                type="button"
                onClick={() => {
                  if (isLoading) {
                    return;
                  }

                  setActiveView(
                      'HISTORY'
                  );

                  setResponse(null);
                  setError(null);
                  setCopied(false);
                  setSelectedHistoryId(null);
                }}
                disabled={isLoading}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    activeView === 'HISTORY'
                        ? 'bg-indigo-500/10 border-indigo-500/40 text-slate-100'
                        : 'bg-[#101420] border-white/5 hover:border-white/15 text-slate-300'
                }`}
            >

              <div className="flex items-center justify-between">

                <History
                    className={`w-4 h-4 ${
                        activeView === 'HISTORY'
                            ? 'text-indigo-400'
                            : 'text-slate-400'
                    }`}
                />

                {history.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-slate-300">
                  {history.length}
                </span>
                )}

              </div>

              <div>

                <p className="text-xs font-semibold text-slate-200">
                  History
                </p>

                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                  Previous AI analyses
                </p>

              </div>

            </button>

          </div>

          {/* ================================= */}
          {/* HISTORY VIEW */}
          {/* ================================= */}

          {activeView === 'HISTORY' && (
              <div className="space-y-3">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-sm font-semibold text-slate-200">
                      AI History
                    </p>

                    <p className="text-xs text-slate-400 mt-0.5">
                      Previous analyses and questions for this document
                    </p>

                  </div>

                  <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                          loadHistory(
                              file.id
                          )
                      }
                      disabled={
                        isHistoryLoading
                      }
                      leftIcon={
                        <RefreshCw
                            className={`w-3.5 h-3.5 ${
                                isHistoryLoading
                                    ? 'animate-spin'
                                    : ''
                            }`}
                        />
                      }
                  >
                    Refresh
                  </Button>

                </div>

                {isHistoryLoading && (
                    <div className="p-6 rounded-xl bg-[#0F131F] border border-white/10 text-center">

                      <RefreshCw className="w-5 h-5 mx-auto text-indigo-400 animate-spin" />

                      <p className="text-xs text-slate-400 mt-2">
                        Loading AI history...
                      </p>

                    </div>
                )}

                {!isHistoryLoading &&
                    history.length === 0 && (
                        <div className="p-8 rounded-xl border border-dashed border-white/10 text-center">

                          <History className="w-7 h-7 mx-auto text-slate-500" />

                          <p className="text-sm text-slate-300 mt-3">
                            No AI history yet
                          </p>

                          <p className="text-xs text-slate-500 mt-1">
                            Your summaries, notes, and questions will appear here.
                          </p>

                        </div>
                    )}

                {!isHistoryLoading &&
                    history.length > 0 && (
                        <div className="max-h-[48vh] overflow-y-auto custom-scrollbar space-y-2">

                          {history.map(
                              (item) => (
                                  <button
                                      key={item.id}
                                      type="button"
                                      onClick={() =>
                                          handleHistoryClick(
                                              item
                                          )
                                      }
                                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                                          selectedHistoryId ===
                                          item.id
                                              ? 'bg-indigo-500/10 border-indigo-500/40'
                                              : 'bg-[#0F121C] border-white/10 hover:border-white/20'
                                      }`}
                                  >

                                    <div className="flex items-start justify-between gap-3">

                                      <div className="flex items-center gap-2 min-w-0">

                                        {item.action ===
                                        'SUMMARY' ? (
                                            <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                                        ) : item.action ===
                                        'DETAILED_NOTES' ? (
                                            <ListFilter className="w-4 h-4 text-indigo-400 shrink-0" />
                                        ) : (
                                            <MessageSquare className="w-4 h-4 text-indigo-400 shrink-0" />
                                        )}

                                        <span className="text-xs font-semibold text-slate-200">
                              {item.action ===
                              'SUMMARY'
                                  ? 'Executive Summary'
                                  : item.action ===
                                  'DETAILED_NOTES'
                                      ? 'Detailed Notes'
                                      : 'Question'}
                            </span>

                                      </div>

                                      <span className="text-[10px] text-slate-500 shrink-0">
                            {formatHistoryDate(
                                item.createdAt
                            )}
                          </span>

                                    </div>

                                    {item.action ===
                                        'QUESTION' &&
                                        item.question && (
                                            <p className="text-xs text-slate-300 mt-2 line-clamp-2">
                                              {item.question}
                                            </p>
                                        )}

                                    <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">
                                      {item.response}
                                    </p>

                                  </button>
                              )
                          )}

                        </div>
                    )}

              </div>
          )}

          {/* ================================= */}
          {/* QUESTION INPUT */}
          {/* ================================= */}

          {activeView === 'QUESTION' && (
              <div className="p-3.5 rounded-xl bg-[#0F121C] border border-white/10 space-y-2">

                <label
                    htmlFor="ai-question-input"
                    className="text-xs font-medium text-slate-300 block"
                >
                  Ask a question about this document
                </label>

                <div className="flex gap-2">

                  <input
                      id="ai-question-input"
                      type="text"
                      value={question}
                      onChange={(e) =>
                          setQuestion(
                              e.target.value
                          )
                      }
                      onKeyDown={(e) => {
                        if (
                            e.key === 'Enter' &&
                            !e.shiftKey
                        ) {
                          e.preventDefault();

                          handleExecute(
                              'QUESTION'
                          );
                        }
                      }}
                      disabled={isLoading}
                      placeholder="e.g., What are the terms of termination or primary metrics?"
                      className="flex-1 rounded-lg bg-[#141824] text-slate-100 placeholder:text-slate-500 text-sm py-2 px-3 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 focus:outline-none transition-colors"
                  />

                  <Button
                      variant="primary"
                      onClick={() =>
                          handleExecute(
                              'QUESTION'
                          )
                      }
                      isLoading={
                        isLoading
                      }
                      disabled={
                        !question.trim()
                      }
                      leftIcon={
                        <Send className="w-3.5 h-3.5" />
                      }
                  >
                    Ask
                  </Button>

                </div>
              </div>
          )}

          {/* ================================= */}
          {/* LOADING */}
          {/* ================================= */}

          {showStartingIndicator && (
              <div className="p-5 rounded-xl bg-[#0F131F] border border-indigo-500/20 flex items-center gap-3.5">

                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 animate-spin">

                  <Sparkles className="w-4 h-4" />

                </div>

                <div>

                  <p className="text-sm font-medium text-slate-200">

                    {activeView === 'SUMMARY' &&
                        'Synthesizing document summary...'}

                    {activeView ===
                        'DETAILED_NOTES' &&
                        'Generating structured breakdown & notes...'}

                    {activeView ===
                        'QUESTION' &&
                        `Searching context to answer: "${lastQuestion || question}"...`}

                  </p>

                  <p className="text-xs text-slate-400 mt-0.5">
                    Processing through RAG embedding and LLM analysis engine
                  </p>

                </div>

              </div>
          )}

          {/* ================================= */}
          {/* ERROR */}
          {/* ================================= */}

          {error &&
              !isLoading && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start gap-3">

                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />

                    <div className="flex-1 text-xs leading-relaxed">

                      <p className="font-semibold text-rose-200">
                        Analysis Error
                      </p>

                      <p className="mt-0.5 text-rose-300/90">
                        {error}
                      </p>

                    </div>

                  </div>
              )}

          {/* ================================= */}
          {/* RESPONSE */}
          {/* ================================= */}

          {showResponsePanel && (
              <div className="space-y-2">

                <div className="flex items-center justify-between">

              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">

                {lastAction ===
                    'SUMMARY' &&
                    'Summary Output'}

                {lastAction ===
                    'DETAILED_NOTES' &&
                    'Detailed Notes Output'}

                {lastAction ===
                    'QUESTION' &&
                    `Answer for: "${lastQuestion}"`}

                {isLoading && (
                    <span className="inline-flex items-center gap-1.5 text-indigo-400 normal-case tracking-normal font-medium">

                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />

                    Streaming...

                  </span>
                )}

              </span>

                  <div className="flex items-center gap-2">

                    {/* REFRESH */}
                    {lastAction !==
                        'QUESTION' &&
                        !isLoading && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={
                                  handleRefresh
                                }
                                leftIcon={
                                  <RefreshCw className="w-3.5 h-3.5" />
                                }
                            >
                              Refresh
                            </Button>
                        )}

                    {/* COPY */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={
                          handleCopyResponse
                        }
                        leftIcon={
                          copied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                              <Copy className="w-3.5 h-3.5" />
                          )
                        }
                    >
                      {copied
                          ? 'Copied'
                          : 'Copy'}
                    </Button>

                  </div>

                </div>

                <div
                    ref={
                      responseScrollRef
                    }
                    className="p-4 rounded-xl bg-[#0D101A] border border-white/10 max-h-[38vh] overflow-y-auto custom-scrollbar"
                    aria-live="polite"
                    aria-busy={
                      isLoading
                    }
                >

                  <div className="text-sm text-slate-200 leading-relaxed font-sans selection:bg-indigo-500/30 selection:text-white prose prose-invert max-w-none">

                    <ReactMarkdown
                        remarkPlugins={[
                          remarkGfm,
                        ]}
                    >
                      {response}
                    </ReactMarkdown>

                    {isLoading && (
                        <span
                            className="inline-block w-1.5 h-4 ml-0.5 align-text-bottom bg-indigo-400/80 animate-pulse"
                            aria-hidden="true"
                        />
                    )}

                  </div>

                </div>

              </div>
          )}

          {/* ================================= */}
          {/* EMPTY STATE */}
          {/* ================================= */}

          {!response &&
              !isLoading &&
              !error &&
              activeView !==
              'QUESTION' &&
              activeView !==
              'HISTORY' && (

                  <div className="p-6 rounded-xl border border-dashed border-white/10 text-center flex flex-col items-center justify-center">

                    <Button
                        variant="primary"
                        onClick={() =>
                            handleExecute(
                                activeView
                            )
                        }
                        leftIcon={
                          <Sparkles className="w-4 h-4" />
                        }
                    >
                      Run{' '}
                      {activeView ===
                      'SUMMARY'
                          ? 'Summary'
                          : 'Detailed Notes'}
                    </Button>

                    <p className="text-xs text-slate-400 mt-2">
                      Click to initiate AI processing on this document
                    </p>

                  </div>
              )}

        </div>

      </Modal>
  );
};