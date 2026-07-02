'use client';

import { FolderKanban, Plus, RefreshCw } from 'lucide-react';
import type { StudioCopy } from './copy';
import type { StudioProjectSummary } from './types';
import { formatShortDate } from './helpers';

type Props = {
  copy: StudioCopy;
  projects: StudioProjectSummary[];
  activeProjectId: string | null;
  isLoading: boolean;
  newProjectName: string;
  onNewProjectNameChange: (value: string) => void;
  onStartProject: () => void;
  onOpenProject: (projectId: string) => void;
  onRefresh: () => void;
};

export function ProjectsPanel({
  copy,
  projects,
  activeProjectId,
  isLoading,
  newProjectName,
  onNewProjectNameChange,
  onStartProject,
  onOpenProject,
  onRefresh,
}: Props) {
  return (
    <section className="sqs-panel" aria-label={copy.modeLabels.projects}>
      <div className="sqs-panel-head">
        <form
          className="sqs-project-start"
          onSubmit={(event) => {
            event.preventDefault();
            onStartProject();
          }}
        >
          <input
            value={newProjectName}
            onChange={(event) => onNewProjectNameChange(event.target.value)}
            placeholder={copy.projectNamePlaceholder}
          />
          <button type="submit" disabled={isLoading}>
            <Plus size={14} />
            <span>{copy.newProject}</span>
          </button>
        </form>
        <button type="button" onClick={onRefresh}>
          <RefreshCw size={14} />
          <span>{copy.refresh}</span>
        </button>
      </div>
      <div className="sqs-project-list">
        {projects.map((item) => (
          <button
            key={item.id}
            type="button"
            className={
              activeProjectId === item.id ? 'sqs-project-card is-active' : 'sqs-project-card'
            }
            onClick={() => onOpenProject(item.id)}
          >
            {item.latestAssetUrl ? (
              <i style={{ backgroundImage: `url("${item.latestAssetUrl}")` }} aria-hidden />
            ) : (
              <span aria-hidden>
                <FolderKanban size={17} />
              </span>
            )}
            <div>
              <strong>{item.businessName}</strong>
              <small>
                {item.assetCount} {copy.assetsCount} / {item.currentStep}
              </small>
            </div>
            <em>{formatShortDate(item.updatedAt)}</em>
          </button>
        ))}
      </div>
      {!projects.length ? (
        <p className="sqs-empty">{isLoading ? copy.loadingProjects : copy.noProjects}</p>
      ) : null}
    </section>
  );
}
