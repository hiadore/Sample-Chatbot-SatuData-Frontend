import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, ChevronsRight, Loader } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
// --- PERHATIAN PENTING ---
// Pustaka 'vega-embed' tetap harus diinstal untuk memenuhi dependensi.
// Jalankan: bun add vega-embed
// -------------------------

// Komponen baru untuk merender grafik Vega-Lite dengan pemuatan skrip yang lebih andal
const VegaChart = ({ spec }) => {
  const chartContainer = useRef(null);
  const [scriptsLoaded, setScriptsLoaded] = useState(window.vegaEmbed); // Cek apakah sudah ada

  useEffect(() => {
    // Jika skrip sudah dimuat sebelumnya, tidak perlu memuat ulang
    if (window.vegaEmbed) {
      setScriptsLoaded(true);
      return;
    }

    let isMounted = true; // Flag untuk mencegah update state pada komponen yang sudah unmount

    const loadScript = (src) => {
        return new Promise((resolve, reject) => {
            // Cek apakah skrip sudah ada
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.async = false; // Penting untuk memuat secara berurutan
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Gagal memuat skrip: ${src}`));
            document.head.appendChild(script);
        });
    };

    // Muat semua skrip yang dibutuhkan Vega secara berurutan
    loadScript("https://cdn.jsdelivr.net/npm/vega@5")
        .then(() => loadScript("https://cdn.jsdelivr.net/npm/vega-lite@5"))
        .then(() => loadScript("https://cdn.jsdelivr.net/npm/vega-embed@6"))
        .then(() => {
            if (isMounted) {
                setScriptsLoaded(true);
            }
        })
        .catch(error => console.error("Gagal memuat pustaka Vega:", error));
    
    return () => {
        isMounted = false;
    };
  }, []); // Hanya dijalankan sekali saat komponen pertama kali dipasang

  useEffect(() => {
    // Hanya coba render grafik jika skrip sudah siap dan semua elemen ada
    if (scriptsLoaded && window.vegaEmbed && spec && chartContainer.current) {
        const embedOptions = { actions: false };
        window.vegaEmbed(chartContainer.current, spec, embedOptions)
          .catch(error => {
            console.error("Vega-Embed Error:", error);
            // Tampilkan pesan error di UI jika render gagal
            if (chartContainer.current) {
              chartContainer.current.innerHTML = `<div style="color: red; padding: 10px;">Gagal merender grafik.</div>`;
            }
          });
    }
  }, [spec, scriptsLoaded]);

  // Tampilkan pesan loading saat skrip sedang dimuat
  if (!scriptsLoaded) {
      return <div className="mt-2 p-2 text-xs text-gray-500">Memuat pustaka grafik...</div>;
  }

  return <div ref={chartContainer} className="mt-2 bg-white p-2 rounded" />;
};


// Komponen untuk me-render pesan dengan ikon yang sesuai
const ChatMessage = ({ message }) => {
  const { sender, text, type, tool_data } = message;
  const isBot = sender === 'bot';

  // Cek apakah output alat adalah grafik untuk menentukan state awal
  const isChart = () => {
    if (type !== 'tool_output') return false;
    try {
      const parsed = JSON.parse(tool_data.content);
      return parsed && !!parsed.chart;
    } catch (e) {
      return false;
    }
  };
  
  // State untuk mengontrol visibilitas detail alat (show/hide)
  // Defaultnya show jika itu adalah chart, dan hide jika bukan.
  const [isExpanded, setIsExpanded] = useState(isChart());

  const renderContent = () => {
    // Jika pesan adalah panggilan alat, buat menjadi komponen yang bisa di-toggle
    if (type === 'tool_call') {
      return (
        <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded-md border border-gray-200">
          <div
            className="flex items-center gap-2 font-semibold cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <ChevronsRight
              className={`w-4 h-4 text-blue-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
            <span>Memanggil Alat: <code className="font-mono bg-gray-200 px-1 rounded">{tool_data.name}</code></span>
          </div>
          {isExpanded && (
            <pre className="mt-2 text-xs bg-gray-200 p-2 rounded overflow-x-auto">
              {JSON.stringify(tool_data.args, null, 2)}
            </pre>
          )}
        </div>
      );
    }
    // Jika pesan adalah hasil dari alat, periksa apakah mengandung grafik
    if (type === 'tool_output') {
      let parsedContent;
      try {
        parsedContent = JSON.parse(tool_data.content);
      } catch (e) {
        parsedContent = null;
      }

      if (parsedContent && parsedContent.chart) {
        return (
          <div className="text-xs text-gray-500 bg-green-50 p-2 rounded-md border border-green-200">
            <div
              className="flex items-center gap-2 font-semibold cursor-pointer"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <ChevronsRight
                className={`w-4 h-4 text-green-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              />
              <span>Hasil Alat <code className="font-mono bg-gray-200 px-1 rounded">{tool_data.name}</code>:</span>
            </div>
            {isExpanded && (
              <VegaChart spec={parsedContent.chart} />
            )}
          </div>
        );
      }

      return (
        <div className="text-xs text-gray-500 bg-green-50 p-2 rounded-md border border-green-200">
          <div
            className="flex items-center gap-2 font-semibold cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <ChevronsRight
              className={`w-4 h-4 text-green-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
            <span>Hasil Alat <code className="font-mono bg-gray-200 px-1 rounded">{tool_data.name}</code>:</span>
          </div>
          {isExpanded && (
            <p className="mt-2 text-xs">{tool_data.content}</p>
          )}
        </div>
      );
    }
    
    // Render jawaban akhir menggunakan ReactMarkdown
    return (
        <div className="prose prose-sm max-w-none prose-p:my-2">
            <ReactMarkdown>{text}</ReactMarkdown>
        </div>
    );
  };

  return (
    <div className={`flex items-start gap-3 my-4 ${isBot ? '' : 'flex-row-reverse'}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isBot ? 'bg-blue-500 text-white' : 'bg-gray-700 text-white'}`}>
        {isBot ? <Bot size={20} /> : <User size={20} />}
      </div>
      <div className={`p-3 rounded-lg max-w-lg ${isBot ? 'bg-gray-100 text-gray-800 rounded-tl-none' : 'bg-blue-500 text-white rounded-tr-none'}`}>
        {renderContent()}
      </div>
    </div>
  );
};


function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const messagesEndRef = useRef(null);

  // Hasilkan ID sesi unik saat komponen pertama kali dimuat
  useEffect(() => {
    setSessionId(crypto.randomUUID());
    setMessages([
        { sender: 'bot', text: 'Halo! Saya adalah Po\' Tata, siap membantu kamu memberikan informasi terkait DKI Jakarta' }
    ]);
  }, []);

  // Scroll ke pesan terakhir setiap kali ada pesan baru
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
        const response = await fetch('http://localhost:8000/chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, message: input }),
        });

        if (!response.ok || !response.body) {
            throw new Error('Network response was not ok.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const processText = ({ done, value }) => {
            if (done) {
                setIsLoading(false);
                return;
            }
            
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n\n');
            buffer = parts.pop(); // Simpan bagian yang tidak lengkap untuk iterasi berikutnya

            parts.forEach(part => {
                if (part.startsWith('data: ')) {
                    const dataStr = part.substring(6);
                    try {
                        const data = JSON.parse(dataStr);
                        handleServerEvent(data);
                    } catch (error) {
                        console.error('Failed to parse JSON:', dataStr, error);
                    }
                }
            });

            reader.read().then(processText);
        };
        
        reader.read().then(processText);

    } catch (error) {
        console.error('Fetch error:', error);
        setMessages(prev => [...prev, { sender: 'bot', text: 'Maaf, terjadi kesalahan koneksi ke server.' }]);
        setIsLoading(false);
    }
  };
  
  const handleServerEvent = (data) => {
    // Gunakan crypto.randomUUID() untuk ID pesan agar tidak perlu dependensi eksternal
    if (data.type === 'tool_call') {
      const toolMessage = {
        id: crypto.randomUUID(),
        sender: 'bot',
        type: 'tool_call',
        tool_data: { name: data.tool_name, args: data.tool_args },
        text: `Memanggil alat: ${data.tool_name}`
      };
      setMessages(prev => [...prev, toolMessage]);
    } else if (data.type === 'tool_output') {
      const toolMessage = {
        id: crypto.randomUUID(),
        sender: 'bot',
        type: 'tool_output',
        tool_data: { name: data.tool_name, content: data.content },
        text: `Hasil dari alat: ${data.tool_name}`
      };
      setMessages(prev => [...prev, toolMessage]);
    } else if (data.type === 'final_answer') {
      const finalMessage = {
        id: crypto.randomUUID(),
        sender: 'bot',
        text: data.content,
      };
      setMessages(prev => [...prev, finalMessage]);
    } else if (data.type === 'end') {
      setIsLoading(false);
    } else if (data.type === 'error') {
        const errorMessage = {
            id: crypto.randomUUID(),
            sender: 'bot',
            text: `Error: ${data.content}`
        };
        setMessages(prev => [...prev, errorMessage]);
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      <header className="bg-white border-b border-gray-200 p-4 shadow-sm">
        <h1 className="text-xl font-bold text-gray-800 text-center">Chatbot Satudata Jakarta</h1>
      </header>
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          {messages.map((msg, index) => (
            <ChatMessage key={index} message={msg} />
          ))}
          {isLoading && (
            <div className="flex items-start gap-3 my-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
                <Bot size={20} />
              </div>
              <div className="p-3 rounded-lg bg-gray-100 text-gray-800 rounded-tl-none flex items-center">
                <Loader className="animate-spin w-5 h-5 text-blue-500" />
                <span className="ml-2 text-sm text-gray-500">Memproses...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ketik pesan Anda..."
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="bg-blue-500 text-white p-3 rounded-lg disabled:bg-blue-300 hover:bg-blue-600 transition-colors flex items-center justify-center"
              disabled={isLoading}
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}

export default App;
