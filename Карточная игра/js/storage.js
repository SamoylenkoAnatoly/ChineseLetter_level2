const Storage = {
  key:'tavern_hanzi_stats_v1',
  blank() { return {wins:0,losses:0,draws:0,cards:{}}; },
  load() {
    try {
      const raw=localStorage.getItem(this.key);
      if (raw) {
        const data=JSON.parse(raw);
        if (data && typeof data.wins==='number' && data.cards && typeof data.cards==='object') return data;
      }
    } catch(e) {}
    return this.blank();
  },
  saveMatch(s) {
    const data=this.load();
    if (s.result==='player') data.wins++;
    else if (s.result==='enemy') data.losses++;
    else data.draws++;
    for (const [id,v] of Object.entries(s.matchStats)) {
      const entry=data.cards[id] ||= {correct:0,wrong:0};
      entry.correct+=v.correct; entry.wrong+=v.wrong;
    }
    try { localStorage.setItem(this.key,JSON.stringify(data)); } catch(e) {}
  },
  reset() { try { localStorage.removeItem(this.key); } catch(e) {} }
};
