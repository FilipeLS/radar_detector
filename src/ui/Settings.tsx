// Settings screen (R6) — toggles for point types, voice, volume, keep-awake.

import { useState } from 'react';
import type { AppSettings } from '../types';
import './Settings.css';

const ALL_TIPOS: { key: string; label: string }[] = [
  { key: 'RF', label: 'Radar fixo (RF)' },
  { key: 'RM', label: 'Radar móvel (RM)' },
  { key: 'SR', label: 'Semáforo com radar (SR)' },
  { key: 'SC', label: 'Semáforo com câmera (SC)' },
  { key: 'PRv', label: 'Polícia rodoviária (PRv)' },
  { key: 'LOM', label: 'Lombada (LOM)' },
  { key: 'PED', label: 'Pedágio (PED)' },
];

interface SettingsProps {
  settings: AppSettings;
  onSave: (s: AppSettings) => void;
  onClose: () => void;
}

interface ToggleProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

function Toggle({ id, checked, onChange, label }: ToggleProps) {
  return (
    <label className="toggle" aria-label={label}>
      <input
        id={id}
        type="checkbox"
        className="toggle__input"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle__track" aria-hidden="true" />
    </label>
  );
}

export function Settings({ settings, onSave, onClose }: SettingsProps) {
  const [tiposAtivos, setTiposAtivos] = useState<string[]>(settings.tiposAtivos);
  const [vozAtiva, setVozAtiva] = useState(settings.vozAtiva);
  const [volume, setVolume] = useState(settings.volume);
  const [manterTela, setManterTela] = useState(settings.manterTela);
  const [avisarAcimaLimite, setAvisarAcimaLimite] = useState(settings.avisarAcimaLimite);

  function toggleTipo(key: string, active: boolean) {
    setTiposAtivos((prev) =>
      active ? [...prev, key] : prev.filter((t) => t !== key)
    );
  }

  function handleSave() {
    onSave({ tiposAtivos, vozAtiva, volume, manterTela, avisarAcimaLimite });
  }

  return (
    <div className="settings">
      <div className="settings__header">
        <span className="settings__title">Configurações</span>
        <button className="settings__close-btn" onClick={onClose} aria-label="Fechar">
          ✕
        </button>
      </div>

      <div className="settings__body">
        {/* Point types */}
        <section className="settings__section" aria-label="Tipos de ponto">
          <div className="settings__section-title">Tipos de ponto</div>
          {ALL_TIPOS.map(({ key, label }) => (
            <div key={key} className="settings__row">
              <label htmlFor={`tipo-${key}`} className="settings__row-label">
                {label}
              </label>
              <Toggle
                id={`tipo-${key}`}
                checked={tiposAtivos.includes(key)}
                onChange={(active) => toggleTipo(key, active)}
                label={label}
              />
            </div>
          ))}
        </section>

        {/* Alert options */}
        <section className="settings__section" aria-label="Avisos">
          <div className="settings__section-title">Avisos</div>

          <div className="settings__row">
            <label htmlFor="toggle-voz" className="settings__row-label">
              Voz em português
            </label>
            <Toggle
              id="toggle-voz"
              checked={vozAtiva}
              onChange={setVozAtiva}
              label="Voz em português"
            />
          </div>

          <div className="settings__row">
            <div>
              <div className="settings__row-label">Volume do alarme</div>
              <div className="settings__row-sub">{Math.round(volume * 100)}%</div>
            </div>
            <input
              type="range"
              className="settings__slider"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              aria-label="Volume do alarme"
            />
          </div>

          <div className="settings__row">
            <label htmlFor="toggle-acima" className="settings__row-label">
              Avisar quando acima do limite
            </label>
            <Toggle
              id="toggle-acima"
              checked={avisarAcimaLimite}
              onChange={setAvisarAcimaLimite}
              label="Avisar quando acima do limite"
            />
          </div>
        </section>

        {/* Screen */}
        <section className="settings__section" aria-label="Tela">
          <div className="settings__section-title">Tela</div>
          <div className="settings__row">
            <label htmlFor="toggle-tela" className="settings__row-label">
              Manter tela ligada
            </label>
            <Toggle
              id="toggle-tela"
              checked={manterTela}
              onChange={setManterTela}
              label="Manter tela ligada"
            />
          </div>
        </section>

        {/* Battery guidance */}
        <section className="settings__section" aria-label="Bateria">
          <div className="settings__section-title">Bateria</div>
          <p className="settings__battery-info">
            Para garantir o funcionamento em segundo plano, desative a otimização de bateria
            para este app nas configurações do Android.
          </p>
        </section>
      </div>

      <div className="settings__footer">
        <button className="settings__save-btn" onClick={handleSave}>
          SALVAR
        </button>
      </div>
    </div>
  );
}
