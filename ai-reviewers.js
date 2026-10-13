/* Exactly five independent reviews through the user's configured AI gateway. */
'use strict';
window.AIReviewers = (function () {
  const defaults = {claude:'claude-sonnet-5-5',deepseek:'deepseek-v4-pro',zai:'glm-5.3',gemini:'gemini-3.8-flash'};
  function list(settings) {
    const models = settings.reviewModels || {};
    return [['openai','ChatGPT / Codex',settings.model||'gpt-6.1-sol'],['claude','Claude',models.claude||defaults.claude],['deepseek','DeepSeek',models.deepseek||defaults.deepseek],['zai','Z.ai',models.zai||defaults.zai],['gemini','Gemini 3.8 Flash',models.gemini||defaults.gemini]].map(([id,name,model])=>({id,name,model:String(model).trim()}));
  }
  function merge(reviews) {
    const complete = review => review.report && !review.report.incomplete && !review.report.raw;
    const finished = reviews.filter(complete), errors=[], steps=[], notes=[], summaries=[], uses=[];
    for(const review of finished) {
      const report=review.report;
      for(const issue of report.errors||[]) errors.push({...issue,reviewers:[review.name]});
      const explanation=report.explanation||{};
      if(explanation.summary)summaries.push(review.name+': '+explanation.summary);
      steps.push(...(explanation.steps||[])); uses.push(...(explanation.uses||[]));notes.push(...(explanation.notes||[]));
    }
    const reviewers=reviews.map(review=>({id:review.id,name:review.name,model:review.model,complete:complete(review),coverage:review.report?.coverage||null,error:review.error||review.report?.parseNote||(!complete(review)?(review.report?.explanation?.notes||[]).join(' '):'')}));
    for(const review of reviewers)if(!review.complete)notes.push(review.name+': بررسی کامل نشد'+(review.error?' — '+review.error:''));
    const risk={clean:0,unknown:0,suspicious:1,malicious:2};
    const security=finished.map(review=>review.report.security).filter(Boolean).sort((a,b)=>(risk[b.verdict]||0)-(risk[a.verdict]||0))[0]||null;
    return {valid:finished.length===5&&finished.every(review=>review.report.valid),incomplete:finished.length!==5,errors,security,
      reviewers,coverage:{totalReviewers:5,completedReviewers:finished.length,models:reviewers},
      explanation:{summary:summaries.join('\n\n'),steps:[...new Set(steps)],uses:[...new Set(uses)],notes:[...new Set(notes)]}};
  }
  return {defaults,list,merge};
})();
