import customtkinter as ctk
from tkinter import messagebox
import yt_dlp
import threading
import os

ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

class OrbeExtractor(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("Orbe Systems - YT MP3 Extractor")
        self.geometry("600x480")
        self.resizable(False, False)

        # Main frame matching Orbe Systems Hub aesthetic
        self.main_frame = ctk.CTkFrame(self, corner_radius=15, fg_color="#0b1324", border_width=1, border_color="#1e293b")
        self.main_frame.pack(pady=20, padx=20, fill="both", expand=True)

        self.label_title = ctk.CTkLabel(self.main_frame, text="YT EXTRACT PROTOCOL", font=ctk.CTkFont(size=24, weight="bold"), text_color="#00fff5")
        self.label_title.pack(pady=20)

        self.label_desc = ctk.CTkLabel(self.main_frame, text="Busca a faixa pelo nome do artista e título, efetuando o\ndownload em alta qualidade (requer FFmpeg instalado para MP3).", text_color="#cbd5e1", gap=2)
        self.label_desc.pack(pady=(0, 20))

        # Inputs
        self.entry_artist = ctk.CTkEntry(self.main_frame, placeholder_text="Nome do Artista (ex: Daft Punk)", width=350, height=45, font=("Consolas", 12))
        self.entry_artist.pack(pady=10)

        self.entry_song = ctk.CTkEntry(self.main_frame, placeholder_text="Nome da Música (ex: Harder Better)", width=350, height=45, font=("Consolas", 12))
        self.entry_song.pack(pady=10)

        self.progress_bar = ctk.CTkProgressBar(self.main_frame, width=350, height=8, progress_color="#bc13fe")
        self.progress_bar.set(0)
        self.progress_bar.pack(pady=20)

        self.btn_download = ctk.CTkButton(self.main_frame, text="INICIAR EXTRAÇÃO", font=ctk.CTkFont(weight="bold"), 
                                          fg_color="#3b82f6", hover_color="#06b6d4", width=350, height=45,
                                          command=self.start_download)
        self.btn_download.pack(pady=10)

        self.status_label = ctk.CTkLabel(self.main_frame, text="Aguardando parâmetros...", font=ctk.CTkFont(size=11), text_color="#64748b")
        self.status_label.pack(side="bottom", pady=10)

    def start_download(self):
        artist = self.entry_artist.get().strip()
        song = self.entry_song.get().strip()
        if not artist or not song:
            messagebox.showwarning("Aviso de Segurança", "Os campos Artista e Música são obrigatórios.")
            return

        self.btn_download.configure(state="disabled", text="Estabelecendo Conexão...")
        self.progress_bar.set(0)
        self.status_label.configure(text="Conectando aos nós da rede de mídia...")

        # Run in a background thread to prevent UI freezing
        thread = threading.Thread(target=self.download_task, args=(artist, song), daemon=True)
        thread.start()

    def progress_hook(self, d):
        if d['status'] == 'downloading':
            try:
                percent_str = d.get('_percent_str', '').strip()
                speed_str = d.get('_speed_str', 'N/A').strip()
                # Remove ANSI color codes commonly output by yt-dlp
                percent_clean = ''.join(c for c in percent_str if c.isascii() and not c.startswith('\x1b'))
                
                # Update progress bar simply (fake parsing or just bouncing)
                # Note: a proper parsing of the percentage float is needed for progress bar, this just displays text.
                self.status_label.after(10, lambda: self.status_label.configure(text=f"Extraindo: {percent_clean} >> TX: {speed_str}"))
                self.progress_bar.set(0.5) # Indeterminate midpoint while downloading
            except Exception:
                pass
        elif d['status'] == 'finished':
            self.status_label.after(10, lambda: self.status_label.configure(text="Download concluído. Processando conversão final..."))

    def download_task(self, artist, song):
        search_query = f"ytsearch1:{artist} {song} official audio"
        download_path = os.path.join(os.path.expanduser("~"), "Downloads")

        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(download_path, '%(title)s.%(ext)s'),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'progress_hooks': [self.progress_hook],
            'quiet': True,
            'no_warnings': True,
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([search_query])
            
            # Use .after to safely update UI from the secondary thread
            self.btn_download.after(10, lambda: self.finish_state("Sucesso", f"Operação concluída. MP3 gerado na pasta Downloads."))
        except Exception as e:
            self.btn_download.after(10, lambda e=e: self.finish_state("Erro", f"Falha na extração. Certifique-se de ter o FFmpeg nas variáveis de ambiente.\nLog: {str(e)}"))

    def finish_state(self, status, msg):
        self.btn_download.configure(state="normal", text="INICIAR NOVA EXTRAÇÃO")
        self.progress_bar.set(1)
        self.status_label.configure(text=status)
        if status == "Sucesso":
            messagebox.showinfo("Sucesso", msg)
        else:
            messagebox.showerror("Erro Crítico", msg)

if __name__ == "__main__":
    app = OrbeExtractor()
    app.mainloop()
