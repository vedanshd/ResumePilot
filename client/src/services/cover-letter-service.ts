import { apiRequest } from "@/lib/queryClient";

export interface CoverLetter {
  id: string;
  userId?: string;
  resumeId: string;
  jdId: string;
  tone: string;
  content: string;
  contentMd: string;
  version?: number;
  createdAt: string;
}

export interface GenerateCoverLetterRequest {
  resumeId: string;
  jdId: string;
  tone?: 'professional' | 'friendly' | 'enthusiastic';
  length?: 'short' | 'medium' | 'long';
}

export interface BatchGenerateRequest {
  resumeId: string;
  jdIds: string[];
  tone?: 'professional' | 'friendly' | 'enthusiastic';
  wordCount?: number;
}

class CoverLetterService {
  /**
   * Generate a single cover letter for a job description
   */
  async generateCoverLetter(request: GenerateCoverLetterRequest): Promise<CoverLetter> {
    const response = await apiRequest("POST", "/api/covers/generate", request);
    return response.json();
  }

  /**
   * Get all cover letters for the current user
   */
  async getCoverLetters(): Promise<CoverLetter[]> {
    const response = await apiRequest("GET", "/api/covers");
    return response.json();
  }

  /**
   * Get a specific cover letter by ID
   */
  async getCoverLetter(id: string): Promise<CoverLetter> {
    const response = await apiRequest("GET", `/api/covers/${id}`);
    return response.json();
  }

  /**
   * Delete a cover letter
   */
  async deleteCoverLetter(id: string): Promise<void> {
    await apiRequest("DELETE", `/api/covers/${id}`);
  }

  /**
   * Delete all cover letters for the current user
   */
  async deleteAllCoverLetters(): Promise<{ success: boolean; deletedCount: number; message: string }> {
    const response = await apiRequest("DELETE", "/api/covers/bulk/all");
    return response.json();
  }

  /**
   * Improve a cover letter using AI
   */
  async improveCoverLetter(id: string): Promise<{ content: string; suggestions: string[] }> {
    const response = await apiRequest("POST", `/api/covers/${id}/improve`);
    return response.json();
  }

  /**
   * Generate multiple cover letters in batch
   */
  async batchGenerateCoverLetters(request: BatchGenerateRequest): Promise<{ jobId: string }> {
    const response = await apiRequest("POST", "/api/covers/batch", request);
    return response.json();
  }

  /**
   * Get batch job status
   */
  async getBatchJobStatus(jobId: string): Promise<any> {
    const response = await apiRequest("GET", `/api/jobs/${jobId}`);
    return response.json();
  }

  /**
   * Export cover letter as PDF
   */
  async exportCoverLetterPDF(coverId: string): Promise<{ filename: string; document: string }> {
    const response = await apiRequest("POST", "/api/export/cover-pdf", { coverId });
    return response.json();
  }

  /**
   * Download cover letter as text file
   */
  downloadAsText(content: string, filename: string = 'cover-letter.txt'): void {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Copy content to clipboard
   */
  async copyToClipboard(content: string): Promise<void> {
    await navigator.clipboard.writeText(content);
  }
}

export const coverLetterService = new CoverLetterService();
