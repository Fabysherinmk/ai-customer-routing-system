import { AIClassificationResult } from '../types';

export class AiClassificationService {
  /**
   * Classifies a customer request message and assigns category, priority, confidence score,
   * summary, and explanation reason.
   */
  public static async classifyRequest(message: string): Promise<AIClassificationResult> {
    const msgLower = message.toLowerCase();

    // 1. Determine Category
    let category: 'Billing' | 'Technical Support' | 'Sales' | 'General Inquiry' = 'General Inquiry';
    let matchedCategoryKeywords: string[] = [];

    const billingKeywords = ['payment', 'refund', 'invoice', 'charge', 'card', 'billing', 'subscription'];
    const supportKeywords = ['bug', 'error', 'crash', 'broken', 'fail', 'not working', 'issue', 'login', 'server down', 'outage'];
    const salesKeywords = ['demo', 'pricing', 'quote', 'buy', 'purchase', 'sales', 'cost', 'enterprise'];

    // Check Billing keywords
    for (const kw of billingKeywords) {
      if (msgLower.includes(kw)) {
        category = 'Billing';
        matchedCategoryKeywords.push(kw);
      }
    }

    // Check Technical Support keywords
    if (category === 'General Inquiry') {
      for (const kw of supportKeywords) {
        if (msgLower.includes(kw)) {
          category = 'Technical Support';
          matchedCategoryKeywords.push(kw);
        }
      }
    }

    // Check Sales keywords
    if (category === 'General Inquiry') {
      for (const kw of salesKeywords) {
        if (msgLower.includes(kw)) {
          category = 'Sales';
          matchedCategoryKeywords.push(kw);
        }
      }
    }

    // 2. Determine Priority
    let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    let matchedPriorityKeywords: string[] = [];

    const highKeywords = ['urgent', 'server down', 'outage', 'security', 'critical', 'emergency', 'hacked', 'down'];
    const mediumKeywords = ['payment', 'refund', 'invoice', 'bug', 'broken', 'error', 'fail'];

    for (const kw of highKeywords) {
      if (msgLower.includes(kw)) {
        priority = 'HIGH';
        matchedPriorityKeywords.push(kw);
      }
    }

    if (priority !== 'HIGH') {
      for (const kw of mediumKeywords) {
        if (msgLower.includes(kw)) {
          priority = 'MEDIUM';
          matchedPriorityKeywords.push(kw);
        }
      }
    }

    // 3. Generate Confidence
    // Base confidence starts at 0.70. Keywords increase confidence, fallback has lower confidence.
    let confidence = 0.70;
    if (matchedCategoryKeywords.length > 0) {
      confidence = Math.min(0.98, 0.8 + Math.random() * 0.15 + (matchedCategoryKeywords.length * 0.02));
    } else {
      confidence = 0.55 + Math.random() * 0.15;
    }
    // Round to 2 decimal places
    confidence = Math.round(confidence * 100) / 100;

    // 4. Generate Summary
    let summary = '';
    const cleanMsg = message.trim().replace(/\s+/g, ' ');
    const sentenceSplit = cleanMsg.split(/[.!?]+/);
    const firstSentence = sentenceSplit[0] ? sentenceSplit[0].trim() : 'Customer query';

    if (firstSentence.length > 80) {
      summary = firstSentence.substring(0, 77) + '...';
    } else {
      summary = firstSentence;
    }

    // 5. Generate Reason Explanation
    let reason = '';
    if (category === 'General Inquiry') {
      reason = 'No explicit billing, technical support, or sales keywords were detected in the message.';
    } else {
      reason = `Categorized as ${category} due to detected keywords: [${matchedCategoryKeywords.join(', ')}].`;
    }

    if (priority === 'HIGH') {
      reason += ` Set to HIGH priority because of critical terms: [${matchedPriorityKeywords.join(', ')}].`;
    } else if (priority === 'MEDIUM') {
      reason += ` Set to MEDIUM priority due to operational terms: [${matchedPriorityKeywords.join(', ')}].`;
    } else {
      reason += ' Assigned LOW priority as no emergency or billing terms were matched.';
    }

    return {
      category,
      priority,
      confidence,
      summary,
      reason,
    };
  }
}
