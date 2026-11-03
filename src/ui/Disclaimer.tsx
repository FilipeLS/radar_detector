// Disclaimer — shown on first launch (R10).
// Full-screen modal; user must tap 'Entendi' to proceed.

import './Disclaimer.css';

interface DisclaimerProps {
  onAccept: () => void;
}

export function Disclaimer({ onAccept }: DisclaimerProps) {
  return (
    <div
      className="disclaimer"
      role="dialog"
      aria-modal="true"
      aria-label="Aviso importante"
    >
      <div className="disclaimer__card">
        <div className="disclaimer__icon" aria-hidden="true">⚠️</div>
        <h1 className="disclaimer__heading">Atenção</h1>
        <p className="disclaimer__text">
          A base de radares pode estar desatualizada ou incompleta. Respeite sempre os
          limites de velocidade e a sinalização de trânsito.
        </p>
        <button className="disclaimer__btn" onClick={onAccept}>
          Entendi
        </button>
      </div>
    </div>
  );
}
