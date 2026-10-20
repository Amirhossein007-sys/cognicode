/* Review only the models chosen by the user; at most five independent reviews. */
'use strict';
window.AIReviewers = (function () {
  const defaults = {claude:'claude-sonnet-5-5',deepseek:'deepseek-v4-pro',zai:'glm-5.3',gemini:'gemini-3.8-flash'};
  function list(settings) {
    if (!settings) return [];
    if (Array.isArray(settings.selectedModels)) {
      if (!settings.selectedModels.length) return [];
      if (settings.model) {
        const found = settings.selectedModels.find(m => m && m.model === settings.model);
        if (found) return [{ id: found.model, model: found.model, name: found.name || found.model }];
      }
      return settings.selectedModels.slice(0, 1).filter(model=>model && typeof model.model==='string' && model.model.trim()).map(model=>({id:model.model,model:model.model,name:model.name||model.model}));
    }
    const models = settings.reviewModels || {};
    return [['openai','ChatGPT / Codex',settings.model||'gpt-6.1-sol'],['claude','Claude',models.claude||defaults.claude],['deepseek','DeepSeek',models.deepseek||defaults.deepseek],['zai','Z.ai',models.zai||defaults.zai],['gemini','Gemini 3.8 Flash',models.gemini||defaults.gemini]].map(([id,name,model])=>({id,name,model:String(model).trim()}));
  }
  function merge(reviews) {
    const complete = review => review.report && !review.report.incomplete && !review.report.raw;
    const finished = reviews.filter(complete), available = reviews.filter(review=>review.report && !review.report.raw), errors=[], steps=[], notes=[], summaries=[], uses=[];
    for(const review of available) {
      const report=review.report;
      for(const issue of report.errors||[]) errors.push({...issue,reviewers:[review.name]});
      const explanation=report.explanation||{};
      if(explanation.summary)summaries.push(review.name+': '+explanation.summary);
      steps.push(...(explanation.steps||[])); uses.push(...(explanation.uses||[]));notes.push(...(explanation.notes||[]));
    }
    const reviewers=reviews.map(review=>({id:review.id,name:review.name,model:review.model,complete:complete(review),coverage:review.report?.coverage||null,error:review.error||review.report?.parseNote||(!complete(review)?(review.report?.explanation?.notes||[]).join(' '):'')}));
    for(const review of reviewers)if(!review.complete)notes.push(review.name+': بررسی کامل نشد'+(review.error?' — '+review.error:''));
    const risk={clean:0,unknown:0,suspicious:1,malicious:2};
    const security=available.map(review=>review.report.security).filter(Boolean).sort((a,b)=>(risk[b.verdict]||0)-(risk[a.verdict]||0))[0]||null;
    return {valid:reviews.length>0&&finished.length===reviews.length&&finished.every(review=>review.report.valid),incomplete:!reviews.length||finished.length!==reviews.length,errors,security,
      reviewers,coverage:{totalReviewers:reviews.length,completedReviewers:finished.length,models:reviewers},
      explanation:{summary:summaries.join('\n\n'),steps:[...new Set(steps)],uses:[...new Set(uses)],notes:[...new Set(notes)]}};
  }
  return {defaults,list,merge};
})();
