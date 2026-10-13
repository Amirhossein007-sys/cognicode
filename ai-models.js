'use strict';
window.AIModels = (() => {
  function endpoints(base) {
    const url = new URL(String(base || '').trim());
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || url.search || url.hash) throw new Error('آدرس سرویس باید HTTPS و بدون نام کاربری، پارامتر یا بخش اضافی باشد');
    url.pathname = url.pathname.replace(/\/+$/, '').replace(/\/(?:chat\/completions|models)$/i, '');
    return {models:url.href.replace(/\/+$/, '')+'/models',chat:url.href.replace(/\/+$/, '')+'/chat/completions'};
  }
  function proxy(url, value) {
    const px = String(value || '').trim();
    if (!px) return url;
    if (px.includes('{url}')) return px.replace('{url}', encodeURIComponent(url));
    if (px.includes('?')) return px + (/[=&]$/.test(px) ? '' : '&u=') + encodeURIComponent(url);
    return px.replace(/\/+$/, '')+'/?u='+encodeURIComponent(url);
  }
  function family(id) {
    if (/claude|anthropic/i.test(id)) return 'Claude';
    if (/deepseek/i.test(id)) return 'DeepSeek';
    if (/gemini|google/i.test(id)) return 'Gemini';
    if (/(?:^|[/:])glm|z[.-]?ai|zhipu/i.test(id)) return 'Z.ai';
    if (/gpt|chatgpt|codex|(?:^|\/)o[1-9](?:-|$)|openai/i.test(id)) return 'ChatGPT / Codex';
    return 'مدل سرویس';
  }
  function parse(data) {
    const entries = Array.isArray(data) ? data : data && (data.data || data.models);
    if (!Array.isArray(entries)) throw new Error('سرویس فهرست معتبر مدل‌ها را برنگرداند');
    const seen = new Set(), models = [];
    for (const entry of entries) {
      const id = typeof entry === 'string' ? entry : entry && (entry.id || entry.name);
      if (typeof id !== 'string' || !id.trim() || id.length > 200 || /[\u0000-\u001f\u007f]/.test(id) || seen.has(id.trim())) continue;
      const value = id.trim();
      // Non-text endpoints cannot review source through Chat Completions.
      if (/embedding|moderation|whisper|transcribe|dall-e|tts|realtime|sora|image-(?:1|gen)|audio/i.test(value)) continue;
      const modalities = entry && entry.architecture && entry.architecture.output_modalities;
      if (Array.isArray(modalities) && !modalities.includes('text')) continue;
      seen.add(value); models.push({id:value,name:family(value),state:'listed',error:''});
      if (models.length >= 1000) break;
    }
    return models.sort((a,b)=>a.id.localeCompare(b.id));
  }
  function selected(ids, models) {
    const available = new Map(models.filter(m=>m.state==='verified').map(m=>[m.id,m]));
    return [...new Set(Array.isArray(ids)?ids:[])].filter(id=>available.has(id)).slice(0,5).map(id=>({id,model:id,name:available.get(id).name}));
  }
  return {endpoints,proxy,family,parse,selected};
})();
