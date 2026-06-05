import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

export function WindowControls() {
  return (
    <div className="flex h-full shrink-0 items-stretch">
      <button
        aria-label="Minimize"
        className="flex w-10 items-center justify-center text-white/45 transition-colors hover:bg-white/[0.07] hover:text-white"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          void appWindow.minimize();
        }}
        type="button"
      >
        <span className="h-px w-3 bg-current" />
      </button>
      <button
        aria-label="Maximize"
        className="flex w-10 items-center justify-center text-white/45 transition-colors hover:bg-white/[0.07] hover:text-white"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          void appWindow.toggleMaximize();
        }}
        type="button"
      >
        <span className="h-3 w-3 rounded-[2px] border border-current" />
      </button>
      <button
        aria-label="Close"
        className="flex w-10 items-center justify-center text-white/45 transition-colors hover:bg-[#e5484d] hover:text-white"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          void appWindow.close();
        }}
        type="button"
      >
        <span className="relative h-3 w-3 before:absolute before:left-1/2 before:top-0 before:h-3 before:w-px before:-translate-x-1/2 before:rotate-45 before:bg-current after:absolute after:left-1/2 after:top-0 after:h-3 after:w-px after:-translate-x-1/2 after:-rotate-45 after:bg-current" />
      </button>
    </div>
  );
}
