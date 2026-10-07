import api from './api';

export type AiAction = 'SUMMARY' | 'DETAILED_NOTES' | 'QUESTION';

export const analyzeDocument = async (
    fileId: number,
    action: AiAction,
    question?: string
): Promise<string> => {
    const response = await api.post(`/ai/documents/${fileId}`, {
        action,
        ...(action === 'QUESTION' ? { question } : {}),
    });

    return response.data;
};