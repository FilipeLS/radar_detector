// MyPoints screen (R7) — list, edit, delete user points; export, import, replace base.

import { useRef, useState } from 'react';
import type { UserPoint, DatasetJson } from '../types';
import { saveUserPoints } from '../services/storage';
import { validateImport } from '../services/dataset';
import './MyPoints.css';

const TIPOS = ['RF', 'RM', 'SR', 'SC', 'PRv', 'LOM'] as const;
type TipoRadar = (typeof TIPOS)[number];

interface MyPointsProps {
  userPoints: UserPoint[];
  onUpdate: (pts: UserPoint[]) => void;
  onClose: () => void;
  onReplaceBase: (data: DatasetJson) => void;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function MyPoints({ userPoints, onUpdate, onClose, onReplaceBase }: MyPointsProps) {
  const [editId, setEditId] = useState<string | null>(null);
  const [editTipo, setEditTipo] = useState<TipoRadar>('RF');
  const [editLimit, setEditLimit] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'info' } | null>(null);

  const importRef = useRef<HTMLInputElement>(null);
  const baseImportRef = useRef<HTMLInputElement>(null);

  function showMessage(text: string, type: 'error' | 'info') {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4_000);
  }

  // Delete
  function handleDelete(id: string) {
    const updated = userPoints.filter((p) => p.id !== id);
    void saveUserPoints(updated);
    onUpdate(updated);
  }

  // Start inline edit
  function handleStartEdit(pt: UserPoint) {
    setEditId(pt.id);
    setEditTipo(pt.tipo as TipoRadar);
    setEditLimit(pt.limite > 0 ? String(pt.limite) : '');
  }

  // Save inline edit
  function handleSaveEdit(id: string) {
    const limiteParsed = editLimit.trim() === '' ? 0 : parseInt(editLimit.trim(), 10);
    if (isNaN(limiteParsed) || limiteParsed < 0) {
      showMessage('Limite inválido', 'error');
      return;
    }
    const updated = userPoints.map((p) =>
      p.id === id ? { ...p, tipo: editTipo, limite: limiteParsed } : p
    );
    void saveUserPoints(updated);
    onUpdate(updated);
    setEditId(null);
  }

  // Export
  function handleExport() {
    const json = JSON.stringify(userPoints, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meus-radares.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Import user points
  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed: unknown = JSON.parse(text);
        if (!Array.isArray(parsed)) {
          showMessage('Arquivo inválido. Verifique o formato e tente novamente.', 'error');
          return;
        }
        const pts = parsed as UserPoint[];
        void saveUserPoints(pts);
        onUpdate(pts);
        showMessage(`${pts.length} pontos importados.`, 'info');
      } catch {
        showMessage('Arquivo inválido. Verifique o formato e tente novamente.', 'error');
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be selected again
    e.target.value = '';
  }

  // Replace base dataset
  function handleReplaceBaseFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const raw: unknown = JSON.parse(text);
        const result = validateImport(raw, 5_000_000);
        if (!result.ok) {
          showMessage('Arquivo inválido. Verifique o formato e tente novamente.', 'error');
          return;
        }
        onReplaceBase(result.data);
        showMessage('Base substituída com sucesso.', 'info');
      } catch {
        showMessage('Arquivo inválido. Verifique o formato e tente novamente.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="mypoints">
      <div className="mypoints__header">
        <span className="mypoints__title">Meus Pontos</span>
        <button className="mypoints__close-btn" onClick={onClose} aria-label="Fechar">
          ✕
        </button>
      </div>

      <div className="mypoints__body">
        {/* Actions */}
        <div className="mypoints__actions">
          <button className="mypoints__action-btn" onClick={handleExport}>
            📤 Exportar pontos
          </button>
          <button
            className="mypoints__action-btn"
            onClick={() => importRef.current?.click()}
          >
            📥 Importar pontos
          </button>
          <button
            className="mypoints__action-btn mypoints__action-btn--danger"
            onClick={() => baseImportRef.current?.click()}
          >
            🔄 Substituir base de radares
          </button>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={importRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleImportFile}
        />
        <input
          ref={baseImportRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleReplaceBaseFile}
        />

        {/* Message */}
        {message && (
          <div
            className={`mypoints__message mypoints__message--${message.type}`}
            role="alert"
          >
            {message.text}
          </div>
        )}

        {/* Points list */}
        {userPoints.length === 0 ? (
          <p className="mypoints__empty">Nenhum ponto salvo.</p>
        ) : (
          <ul className="mypoints__list" aria-label="Lista de pontos salvos">
            {userPoints.map((pt) => (
              <li key={pt.id}>
                {editId === pt.id ? (
                  <div className="mypoints__edit-form">
                    <div className="mypoints__edit-tipo-row">
                      {TIPOS.map((t) => (
                        <button
                          key={t}
                          className={`mypoints__edit-tipo-btn${editTipo === t ? ' mypoints__edit-tipo-btn--selected' : ''}`}
                          onClick={() => setEditTipo(t)}
                          aria-pressed={editTipo === t}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <label htmlFor={`edit-limit-${pt.id}`} className="mypoints__edit-limit-label">
                      Limite km/h (opcional)
                    </label>
                    <input
                      id={`edit-limit-${pt.id}`}
                      type="number"
                      inputMode="numeric"
                      className="mypoints__edit-limit-input"
                      value={editLimit}
                      onChange={(e) => setEditLimit(e.target.value)}
                      placeholder="0 = não informado"
                      min="0"
                      max="200"
                    />
                    <button
                      className="mypoints__edit-save-btn"
                      onClick={() => handleSaveEdit(pt.id)}
                    >
                      Salvar
                    </button>
                    <button
                      className="mypoints__edit-cancel-btn"
                      onClick={() => setEditId(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="mypoints__item">
                    <div className="mypoints__item-info">
                      <div className="mypoints__item-tipo">{pt.tipo}</div>
                      <div className="mypoints__item-detail">
                        {pt.limite > 0 ? `${pt.limite} km/h · ` : ''}
                        {formatDate(pt.criadoEm)}
                      </div>
                    </div>
                    <div className="mypoints__item-btns">
                      <button
                        className="mypoints__item-btn mypoints__item-btn--edit"
                        onClick={() => handleStartEdit(pt)}
                        aria-label={`Editar ponto ${pt.tipo}`}
                      >
                        Editar
                      </button>
                      <button
                        className="mypoints__item-btn mypoints__item-btn--delete"
                        onClick={() => handleDelete(pt.id)}
                        aria-label={`Excluir ponto ${pt.tipo}`}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
