import React, { useEffect, useState } from 'react';
import { projectStore } from '../../state/projectStore';
import {
  FolderPlus,
  LayoutGrid,
  X,
  Check,
  Sparkles
} from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('New Interior Project');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isCreating) onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen, isCreating, onClose]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isCreating) return;

    setIsCreating(true);
    try {
      await projectStore.createProject({
        name: name.trim(),
        description: description.trim(),
        template: 'blank'
      });

      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="new-project-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !isCreating) onClose();
      }}
    >
      <div className="new-project-dialog w-full max-w-3xl max-h-[92vh] overflow-y-auto animate-in-scale" role="dialog" aria-modal="true" aria-labelledby="new-project-title">
        <div className="new-project-heading">
          <div>
            <p>New workspace</p>
            <h2 id="new-project-title">Give the project a clear starting point.</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="project-dialog-close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCreate} className="new-project-form">
          <div className="project-form-fields">
            <label>
              <span>Project name <b>*</b></span>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Lakeview apartment"
                required
                autoFocus
              />
            </label>
            <label>
              <span>Project note <em>Optional</em></span>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Location, client needs, or the feeling you want to create"
                rows={3}
              />
            </label>
          </div>

          <div className="project-start-panel">
            <div className="blank-plan-preview" aria-hidden="true">
              <div className="blank-plan-room room-a" /><div className="blank-plan-room room-b" /><div className="blank-plan-room room-c" />
              <span><LayoutGrid size={17} /> Empty plan</span>
            </div>
            <div className="project-start-copy">
              <div className="selected-start"><Check size={14} /> Selected</div>
              <h3>Start with a blank plan</h3>
              <p>Draw rooms and walls from scratch, then furnish and inspect the home in 3D.</p>
              <div className="future-import"><Sparkles size={15} /><span><strong>Blueprint import</strong> is coming next.</span></div>
            </div>
          </div>

          <div className="new-project-actions">
            <button
              type="button"
              onClick={onClose}
              className="project-cancel-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isCreating}
              className="project-create-button"
            >
              <FolderPlus size={15} />
              {isCreating ? 'Creating project…' : 'Create project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
