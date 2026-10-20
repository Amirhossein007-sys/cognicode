'use strict';
window.SelectionExplanation = (function () {
  function plan(text, firstLine) {
    const all = AIBudget.split(text, firstLine, 8000), chunks = all.slice(0, 2);
    chunks.partial = all.length > chunks.length; chunks.total = all.length;
    return chunks;
  }
  async function complete(messages, chat, check) {
    check(); const response = await chat(messages, AIBudget.limits.selectionOutput, 0); check();
    const text = String(response.message?.content || '');
    if (!text.trim()) throw new Error('توضیح دریافت نشد؛ درخواست خودکار دیگری ارسال نشد');
    if (response.finishReason !== 'stop') {
      const error = new Error('پاسخ کامل نشد؛ برای کنترل هزینه ادامهٔ خودکار خاموش است. بخش کوچک‌تری انتخاب کن.');
      error.partialText = text; throw error;
    }
    return text;
  }
  return {plan, complete};
})();
