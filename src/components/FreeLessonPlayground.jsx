import { useState } from 'react';
import {
  SandpackCodeEditor,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
  useSandpack,
} from '@codesandbox/sandpack-react';

function PlaygroundControls({ lesson }) {
  const { sandpack } = useSandpack();
  const [actionError, setActionError] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const hasChanges = sandpack.editorState === 'dirty';

  const runCode = async () => {
    setActionError('');
    setIsExecuting(true);

    try {
      await sandpack.runSandpack();
      setHasRun(true);
    } catch (error) {
      console.error('No se pudo ejecutar la lección gratuita', error);
      setActionError('No pudimos ejecutar el ejemplo. Revisa tu conexión e inténtalo otra vez.');
    } finally {
      setIsExecuting(false);
    }
  };

  const resetCode = async () => {
    setActionError('');
    setIsExecuting(true);

    try {
      sandpack.updateFile('/App.js', lesson.code, false);
      await sandpack.runSandpack();
      setHasRun(true);
    } catch (error) {
      console.error('No se pudo restablecer la lección gratuita', error);
      setActionError('No pudimos restablecer el ejemplo. Inténtalo otra vez.');
    } finally {
      setIsExecuting(false);
    }
  };

  const statusMessage = actionError
    ? actionError
    : sandpack.error?.message
      ? 'El playground tuvo un problema al iniciar. Actualiza la página e inténtalo otra vez.'
      : sandpack.status === 'timeout'
        ? 'La vista previa tardó demasiado. Vuelve a ejecutar el ejemplo.'
        : isExecuting
          ? 'Ejecutando el ejemplo...'
          : hasChanges
            ? 'Hay cambios pendientes de ejecutar.'
            : hasRun
              ? 'Vista previa actualizada.'
              : 'Edita el ejemplo y ejecútalo cuando quieras.';
  const hasError = Boolean(actionError || sandpack.error || sandpack.status === 'timeout');

  return (
    <>
      <div className="free-lesson-toolbar">
        <p
          className={`free-lesson-status${hasError ? ' is-error' : ''}`}
          role={hasError ? 'alert' : 'status'}
          aria-live="polite"
        >
          <span className="free-lesson-status-dot" aria-hidden="true" />
          {statusMessage}
        </p>
        <div className="free-lesson-actions">
          <button
            className="button is-light"
            type="button"
            onClick={resetCode}
            disabled={isExecuting || (!hasChanges && !hasRun)}
          >
            Restablecer ejemplo
          </button>
          <button
            className="button is-primary"
            type="button"
            onClick={runCode}
            disabled={isExecuting}
          >
            {isExecuting ? 'Ejecutando...' : 'Ejecutar'}
          </button>
        </div>
      </div>

      <SandpackLayout>
        <section className="playground-panel" aria-label="Editor de código">
          <h3 className="free-lesson-panel-title">Tu código</h3>
          <SandpackCodeEditor
            showLineNumbers
            showTabs={false}
            showRunButton={false}
            closableTabs={false}
            wrapContent
          />
        </section>
        <section className="playground-panel" aria-label="Vista previa del código">
          <h3 className="free-lesson-panel-title">Vista previa</h3>
          {!hasRun && !isExecuting && !sandpack.error && (
            <p className="playground-preview-hint">
              Pulsa <strong>Ejecutar</strong> para ver tu resultado.
            </p>
          )}
          {isExecuting && (
            <p className="playground-preview-hint" role="status">
              Preparando vista previa...
            </p>
          )}
          <SandpackPreview
            showRefreshButton={false}
            showOpenInCodeSandbox={false}
            showNavigator={false}
            showSandpackErrorOverlay
          />
        </section>
      </SandpackLayout>
    </>
  );
}

function FreeLessonPlayground({ courseName, lesson }) {
  return (
    <section className="free-lesson-section" aria-labelledby="free-lesson-title">
      <header className="free-lesson-header">
        <div>
          <span className="free-lesson-kicker">Prueba gratis · 3 minutos</span>
          <h2 id="free-lesson-title">{lesson.title}</h2>
          <p className="free-lesson-course">{courseName}</p>
        </div>
        <span className="free-lesson-badge">Lección gratuita</span>
      </header>

      <div className="free-lesson-intro">
        <p><strong>En esta lección:</strong> {lesson.objective}</p>
        <p>{lesson.concept}</p>
      </div>

      <ol className="free-lesson-steps">
        {lesson.steps.map((step, index) => (
          <li key={step}>
            <span aria-hidden="true">{index + 1}</span>
            {step}
          </li>
        ))}
      </ol>

      <div className="playground-frame">
        <SandpackProvider
          template="react"
          theme="light"
          files={{
            '/App.js': {
              code: lesson.code,
              active: true,
            },
          }}
          options={{
            autorun: false,
            autoReload: false,
            recompileMode: 'delayed',
            recompileDelay: 500,
            editorWidthPercentage: 50,
            editorHeight: '420px',
            resizablePanels: true,
          }}
        >
          <PlaygroundControls lesson={lesson} />
        </SandpackProvider>
      </div>

      <p className="playground-security-note">
        Es una práctica local: no guarda ni envía tus cambios.
      </p>
    </section>
  );
}

export default FreeLessonPlayground;
