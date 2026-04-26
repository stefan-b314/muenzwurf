import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import CoinChart, { type ChartDatum } from './CoinChart';

type TossSide = 'kopf' | 'zahl';

type TossSummary = {
  throws: number;
  zahlCount: number;
  kopfCount: number;
  history: ChartDatum[];
  currentSide: TossSide | null;
};

const DETAIL_FACTORS = [2, 1, 0.8, 0.75, 0.6, 0.5, 0.4, 0.25, 0.2, 0.15, 0.1, 0.08, 0.075, 0.05, 0.04, 0.025, 0.02, 0.0175, 0.014];

function createEmptyState(): TossSummary {
  return {
    throws: 0,
    zahlCount: 0,
    kopfCount: 0,
    history: [],
    currentSide: null,
  };
}

function simulateThrows(previous: TossSummary, count: number): TossSummary {
  let throws = previous.throws;
  let zahlCount = previous.zahlCount;
  let kopfCount = previous.kopfCount;
  const history = [...previous.history];
  let currentSide = previous.currentSide;

  for (let step = 0; step < count; step += 1) {
    const side: TossSide = Math.random() < 0.5 ? 'zahl' : 'kopf';
    throws += 1;
    currentSide = side;

    if (side === 'zahl') {
      zahlCount += 1;
    } else {
      kopfCount += 1;
    }

    history.push({
      trial: throws,
      zahlPercent: (zahlCount / throws) * 100,
      kopfPercent: (kopfCount / throws) * 100,
    });
  }

  return {
    throws,
    zahlCount,
    kopfCount,
    history,
    currentSide,
  };
}

function formatPercent(value: number) {
  return `${value.toFixed(2)} %`;
}

const TOSS_ANIMATION_MS = 920;

type BurstProfile = {
  steps: number;
  durationMs: number;
};

function getBurstProfile(count: number): BurstProfile {
  if (count >= 1000) {
    return {
      steps: 8,
      durationMs: 620,
    };
  }

  if (count >= 50) {
    return {
      steps: 6,
      durationMs: 540,
    };
  }

  return {
    steps: 5,
    durationMs: 760,
  };
}

function simulateThrowSequence(previous: TossSummary, count: number, steps: number) {
  const sequence: TossSummary[] = [];
  let current = previous;
  const frameCount = Math.max(1, Math.min(count, steps));
  const baseChunkSize = Math.floor(count / frameCount);
  let remainder = count % frameCount;

  for (let frame = 0; frame < frameCount; frame += 1) {
    const chunkSize = baseChunkSize + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);
    current = simulateThrows(current, chunkSize);
    sequence.push(current);
  }

  return sequence;
}

export default function App() {
  const [summary, setSummary] = useState<TossSummary>(() => createEmptyState());
  const [displayedThrows, setDisplayedThrows] = useState(0);
  const [diagramVisible, setDiagramVisible] = useState(true);
  const [verticalZoom, setVerticalZoom] = useState(1);
  const [detailLevel, setDetailLevel] = useState(19);
  const [isTossing, setIsTossing] = useState(false);
  const [isBurstTossing, setIsBurstTossing] = useState(false);
  const [burstCount, setBurstCount] = useState<number | null>(null);
  const [burstBadgeKey, setBurstBadgeKey] = useState(0);
  const [coinFace, setCoinFace] = useState<TossSide>('kopf');
  const [tossCount, setTossCount] = useState(0);
  const pendingSummaryRef = useRef<TossSummary | null>(null);
  const animationTimeoutsRef = useRef<number[]>([]);
  const throwAnimationFrameRef = useRef<number | null>(null);

  const zahlPercent = summary.throws > 0 ? (summary.zahlCount / summary.throws) * 100 : 0;
  const kopfPercent = summary.throws > 0 ? (summary.kopfCount / summary.throws) * 100 : 0;
  const detailFactor = DETAIL_FACTORS[detailLevel - 1] ?? DETAIL_FACTORS[DETAIL_FACTORS.length - 1];
  const displaySide = isTossing ? coinFace : summary.currentSide;
  const coinImage =
    displaySide === 'zahl'
      ? `${import.meta.env.BASE_URL}assets/Euro Belgien Zahl Klein.png`
      : `${import.meta.env.BASE_URL}assets/Euro Belgien Kopf Klein.png`;
  const coinAlt = displaySide === 'zahl' ? 'Münze zeigt Zahl' : 'Münze zeigt Kopf';
  const burstVariantClass = burstCount === 1000 ? ' burst-1000' : burstCount === 50 ? ' burst-50' : burstCount === 10 ? ' burst-10' : '';
  const hasStartedThrowing = summary.throws > 0 || isTossing;
  const handleDetailChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDetailLevel(Number(event.target.value));
  };
  const handleVerticalZoomChange = (event: ChangeEvent<HTMLInputElement>) => {
    setVerticalZoom(Number(event.target.value));
  };
  const clearAnimationTimers = () => {
    animationTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    animationTimeoutsRef.current = [];
  };

  const runThrowAnimation = (count: number) => {
    if (isTossing) {
      return;
    }

    clearAnimationTimers();
    setIsTossing(true);
    setTossCount((value) => value + 1);
    if (count === 1) {
      const nextSummary = simulateThrows(summary, count);
      pendingSummaryRef.current = nextSummary;
      setIsBurstTossing(false);
      setBurstCount(null);
      setCoinFace(Math.random() < 0.5 ? 'kopf' : 'zahl');

      const timeoutId = window.setTimeout(() => {
        const resolvedSummary = pendingSummaryRef.current;
        if (resolvedSummary) {
          setSummary(resolvedSummary);
          setCoinFace(resolvedSummary.currentSide ?? 'kopf');
        }

        pendingSummaryRef.current = null;
        setIsTossing(false);
        animationTimeoutsRef.current = animationTimeoutsRef.current.filter((id) => id !== timeoutId);
      }, TOSS_ANIMATION_MS);

      animationTimeoutsRef.current.push(timeoutId);
      return;
    }

    setIsBurstTossing(true);
    setBurstCount(count);
    setBurstBadgeKey((value) => value + 1);
    setCoinFace(Math.random() < 0.5 ? 'kopf' : 'zahl');
    const burstProfile = getBurstProfile(count);
    const sequence = simulateThrowSequence(summary, count, burstProfile.steps);
    pendingSummaryRef.current = sequence.at(-1) ?? summary;
    const stepDuration = Math.max(72, Math.round(burstProfile.durationMs / sequence.length));

    sequence.forEach((frameSummary, index) => {
      const timeoutId = window.setTimeout(() => {
        setSummary(frameSummary);
        setCoinFace(frameSummary.currentSide ?? 'kopf');

        if (index === sequence.length - 1) {
          pendingSummaryRef.current = null;
          setIsTossing(false);
          setIsBurstTossing(false);
          setBurstCount(null);
        }

        animationTimeoutsRef.current = animationTimeoutsRef.current.filter((id) => id !== timeoutId);
      }, stepDuration * (index + 1));

      animationTimeoutsRef.current.push(timeoutId);
    });
  };

  useEffect(() => {
    if (throwAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(throwAnimationFrameRef.current);
      throwAnimationFrameRef.current = null;
    }

    if (summary.throws === 0) {
      setDisplayedThrows(0);
      return;
    }

    const startValue = displayedThrows;
    const targetValue = summary.throws;

    if (startValue === targetValue) {
      return;
    }

    const duration = Math.min(360, Math.max(140, Math.abs(targetValue - startValue) * 20));
    let startTime: number | null = null;

    const step = (timestamp: number) => {
      if (startTime === null) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easedProgress = 1 - (1 - progress) ** 3;
      const nextValue = Math.round(startValue + (targetValue - startValue) * easedProgress);
      setDisplayedThrows(nextValue);

      if (progress < 1) {
        throwAnimationFrameRef.current = window.requestAnimationFrame(step);
      } else {
        throwAnimationFrameRef.current = null;
      }
    };

    throwAnimationFrameRef.current = window.requestAnimationFrame(step);

    return () => {
      if (throwAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(throwAnimationFrameRef.current);
        throwAnimationFrameRef.current = null;
      }
    };
  }, [summary.throws]);

  useEffect(() => {
    return () => {
      clearAnimationTimers();
      if (throwAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(throwAnimationFrameRef.current);
      }
    };
  }, []);

  return (
    <main className="app-shell">
      <section className="panel panel-controls">
        <h1>Münzwurf</h1>

        <div className="button-grid">
          <button type="button" className="action action-primary" onClick={() => runThrowAnimation(1)} disabled={isTossing}>
            1 x werfen
          </button>
          <button type="button" className="action action-primary" onClick={() => runThrowAnimation(10)} disabled={isTossing}>
            10 x
          </button>
          <button type="button" className="action action-primary" onClick={() => runThrowAnimation(50)} disabled={isTossing}>
            50 x
          </button>
          <button type="button" className="action action-primary" onClick={() => runThrowAnimation(1000)} disabled={isTossing}>
            1000 x
          </button>
          <button
            type="button"
            className="action action-danger"
            onClick={() => {
              pendingSummaryRef.current = null;
              clearAnimationTimers();
              setIsTossing(false);
              setIsBurstTossing(false);
              setBurstCount(null);
              setSummary(createEmptyState());
              setCoinFace('kopf');
            }}
          >
            Reset
          </button>
          <button type="button" className={diagramVisible ? 'action action-toggle is-active' : 'action action-toggle'} onClick={() => setDiagramVisible((visible: boolean) => !visible)}>
            Diagramm
          </button>
        </div>

        <div className="control-card">
          <label className="slider-label" htmlFor="detail-level">
            Detailgrad X
            <span>{detailLevel}</span>
          </label>
          <input
            id="detail-level"
            type="range"
            min="1"
            max="19"
            step="1"
            value={detailLevel}
            onChange={handleDetailChange}
          />
          <div className="slider-hint">Faktor: {detailFactor}</div>
        </div>

        <div className="control-card">
          <div className="slider-label">
            Vertikale Fokussierung
            <span>{verticalZoom}x</span>
          </div>
          <div className="zoom-row">
            <button type="button" className="mini-action" onClick={() => setVerticalZoom((value) => Math.max(1, value - 1))}>
              -
            </button>
            <input
              id="vertical-zoom"
              type="range"
              min="1"
              max="20"
              step="1"
              value={verticalZoom}
              onChange={handleVerticalZoomChange}
            />
            <button type="button" className="mini-action" onClick={() => setVerticalZoom((value: number) => Math.min(20, value + 1))}>
              +
            </button>
          </div>
        </div>
      </section>

      <section className="panel panel-stage">
        <div className="coin-card">
          <div>
            <div className="eyebrow">Letzter Wurf</div>
            <h2>{displaySide ? (displaySide === 'zahl' ? 'Zahl' : 'Kopf') : 'Noch kein Wurf'}</h2>
            <p className="subtle">
              {isBurstTossing
                ? `Serienwurf läuft: ${summary.throws} Versuche verarbeitet.`
                : isTossing
                  ? `Münze ist in der Luft${tossCount > 0 ? ' ...' : '.'}`
                  : 'Bei vielen Würfen stabilisieren sich beide Anteile in Richtung 50 %.'}
            </p>
          </div>
          <div className={displaySide ? `coin-frame is-${displaySide}${isTossing ? ' is-tossing' : ''}${isBurstTossing ? ` is-bursting${burstVariantClass}` : ''}` : `coin-frame${isTossing ? ' is-tossing' : ''}${isBurstTossing ? ` is-bursting${burstVariantClass}` : ''}`}>
            <div className="coin-shadow" aria-hidden="true" />
            {isBurstTossing && burstCount ? (
              <div key={burstBadgeKey} className={`burst-badge${burstVariantClass}`}>
                +{burstCount}
              </div>
            ) : null}
            {displaySide ? (
              <img
                key={`${tossCount}-${summary.throws}-${displaySide}`}
                src={coinImage}
                alt={coinAlt}
                className={isBurstTossing ? `coin-image is-bursting${burstVariantClass}` : isTossing ? 'coin-image is-tossing' : 'coin-image'}
              />
            ) : (
              <div className="coin-placeholder">?</div>
            )}
          </div>
        </div>

        <div className="stats-grid">
          <article className="stat-card neutral">
            <span>Versuche</span>
            <strong>{displayedThrows}</strong>
          </article>
          <article className="stat-card red">
            <span>Häufigkeit Zahl</span>
            <strong>{summary.zahlCount} ({formatPercent(zahlPercent)})</strong>
          </article>
          <article className="stat-card blue">
            <span>Häufigkeit Kopf</span>
            <strong>{summary.kopfCount} ({formatPercent(kopfPercent)})</strong>
          </article>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="eyebrow">Gesetz der großen Zahlen</div>
              <h2>Relative Häufigkeiten im Verlauf</h2>
            </div>
            <div className="chart-note">Referenzlinie: 50 %</div>
          </div>
          <CoinChart data={summary.history} detailLevel={detailLevel} verticalZoom={verticalZoom} visible={diagramVisible} hasStarted={hasStartedThrowing} />
        </div>
      </section>
    </main>
  );
}
