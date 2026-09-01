import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface ModalAction {
  label: string;
  cls?: string;
  act: () => void;
}

interface ModalState {
  title: string;
  body: ReactNode;
  actions: ModalAction[];
}

interface ModalContextValue {
  openModal: (title: string, body: ReactNode, actions?: ModalAction[]) => void;
  confirmBox: (title: string, message: string, yes: () => void) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextValue>({
  openModal: () => {},
  confirmBox: () => {},
  closeModal: () => {},
});

export function useModal() {
  return useContext(ModalContext);
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalState | null>(null);

  const openModal = useCallback((title: string, body: ReactNode, actions: ModalAction[] = []) => {
    setModal({ title, body, actions });
  }, []);

  const closeModal = useCallback(() => setModal(null), []);

  const confirmBox = useCallback(
    (title: string, message: string, yes: () => void) => {
      setModal({
        title,
        body: <div className="muted">{message}</div>,
        actions: [{ label: 'Yes, continue', cls: 'btn primary', act: yes }],
      });
    },
    []
  );

  const runAction = (a: ModalAction) => {
    Promise.resolve(a.act());
    closeModal();
  };

  return (
    <ModalContext.Provider value={{ openModal, confirmBox, closeModal }}>
      {children}
      {modal && (
        <div
          className="scrim"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="modal" role="dialog" aria-modal="true">
            <header>
              <h2>{modal.title}</h2>
            </header>
            <div className="body">{modal.body}</div>
            <footer>
              <button className="btn ghost" onClick={closeModal}>
                Cancel
              </button>
              {modal.actions.map((a, i) => (
                <button key={i} className={a.cls || 'btn'} onClick={() => runAction(a)}>
                  {a.label}
                </button>
              ))}
            </footer>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}
