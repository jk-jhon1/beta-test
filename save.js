const SaveSystem = (() => {
  const KEY = 'restuding_save_v1';

  function loadData() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Garante estrutura mínima mesmo se o save for antigo/corrompido
        return {
          endings: Array.isArray(parsed.endings) ? parsed.endings : [],
          muted: !!parsed.muted,
          bestTime: typeof parsed.bestTime === 'number' ? parsed.bestTime : null
        };
      }
    } catch (e) {
      console.warn('Save corrompido, iniciando novo.', e);
    }
    return { endings: [], muted: false, bestTime: null };
  }

  let data = loadData();

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Não foi possível salvar (localStorage indisponível).', e);
    }
  }

  // Retorna true se era um final NOVO (ainda não visto)
  function unlockEnding(id) {
    if (!data.endings.includes(id)) {
      data.endings.push(id);
      persist();
      return true;
    }
    return false;
  }

  function getEndings() {
    return data.endings.slice();
  }

  function setMuted(m) {
    data.muted = !!m;
    persist();
  }

  function getMuted() {
    return data.muted;
  }

  // Retorna true se bateu recorde
  function setBestTime(seconds) {
    if (data.bestTime === null || seconds < data.bestTime) {
      data.bestTime = seconds;
      persist();
      return true;
    }
    return false;
  }

  function getBestTime() {
    return data.bestTime;
  }

  function resetAll() {
    data = { endings: [], muted: false, bestTime: null };
    persist();
  }

  return {
    unlockEnding, getEndings,
    setMuted, getMuted,
    setBestTime, getBestTime,
    resetAll
  };
})();
