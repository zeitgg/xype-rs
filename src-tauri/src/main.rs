// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    init_debug_console();
    xype_lib::run()
}

fn init_debug_console() {
    let debug = std::env::args().any(|arg| arg == "--debug");
    if !debug {
        return;
    }

    std::env::set_var("XYPE_DEBUG", "1");

    #[cfg(windows)]
    {
        let title = "xype debug\0".encode_utf16().collect::<Vec<_>>();
        unsafe {
            let _ = windows_sys::Win32::System::Console::AllocConsole();
            let _ = windows_sys::Win32::System::Console::SetConsoleTitleW(title.as_ptr());
        }
    }

    eprintln!("[xype] debug console enabled");
}
