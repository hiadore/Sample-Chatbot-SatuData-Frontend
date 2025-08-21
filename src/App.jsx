import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, ChevronsRight, Loader, ExternalLink, Database } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Komponen baru untuk merender grafik Vega-Lite dengan pemuatan skrip yang lebih andal
const VegaChart = ({ spec }) => {
  const chartContainer = useRef(null);
  const [scriptsLoaded, setScriptsLoaded] = useState(window.vegaEmbed);

  useEffect(() => {
    if (window.vegaEmbed) {
      setScriptsLoaded(true);
      return;
    }

    let isMounted = true;

    const loadScript = (src) => {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.async = false;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Gagal memuat skrip: ${src}`));
            document.head.appendChild(script);
        });
    };

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
  }, []);

  useEffect(() => {
    if (scriptsLoaded && window.vegaEmbed && spec && chartContainer.current) {
        const embedOptions = { actions: false };
        window.vegaEmbed(chartContainer.current, spec, embedOptions)
          .catch(error => {
            console.error("Vega-Embed Error:", error);
            if (chartContainer.current) {
              chartContainer.current.innerHTML = `<div style="color: red; padding: 10px;">Gagal merender grafik.</div>`;
            }
          });
    }
  }, [spec, scriptsLoaded]);

  if (!scriptsLoaded) {
      return <div className="mt-2 p-2 text-xs text-gray-500">Memuat pustaka grafik...</div>;
  }

  return <div ref={chartContainer} className="mt-2 bg-white p-2 rounded" />;
};

// Komponen baru untuk menampilkan data source information
const DataSourceInfo = ({ dataSource }) => {
  if (!dataSource) return null;
  
  return (
    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm mb-2">
        <Database size={16} />
        <span>Sumber Data</span>
      </div>
      <div className="text-sm">
        <p className="font-medium text-gray-800">{dataSource.name}</p>
        {dataSource.description && (
          <p className="text-gray-600 text-xs mt-1">{dataSource.description}</p>
        )}
        <a 
          href={dataSource.source_url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-2 text-blue-600 hover:text-blue-800 text-xs font-medium transition-colors"
        >
          <ExternalLink size={12} />
          Lihat Data Lengkap
        </a>
      </div>
    </div>
  );
};

// Komponen untuk me-render pesan dengan ikon yang sesuai
const ChatMessage = ({ message }) => {
  const { sender, text, type, tool_data, session_info } = message;
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
  const [isExpanded, setIsExpanded] = useState(isChart());

  const renderContent = () => {
    // Tampilkan session info jika ada
    if (type === 'session_info') {
      return (
        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded-md border border-blue-200">
          <div className="flex items-center gap-2">
            <Database size={14} />
            <span>Session: {session_info?.session_id?.substring(0, 8)}... | Messages: {session_info?.message_count}</span>
          </div>
        </div>
      );
    }

    // Jika pesan adalah panggilan alat
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

    // Jika pesan adalah hasil dari alat
    if (type === 'tool_output') {
      let parsedContent;
      let dataSource = null;
      
      try {
        parsedContent = JSON.parse(tool_data.content);
        // Extract data source info jika ada
        if (parsedContent && parsedContent.data_source) {
          dataSource = parsedContent.data_source;
        }
      } catch (e) {
        parsedContent = null;
      }

      // Cek apakah ada data source dari tool_data langsung (dari enhanced stream)
      if (tool_data.data_source) {
        dataSource = tool_data.data_source;
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
              <div>
                <VegaChart spec={parsedContent.chart} />
                <DataSourceInfo dataSource={dataSource} />
              </div>
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
            <div>
              <p className="mt-2 text-xs">{tool_data.content}</p>
              <DataSourceInfo dataSource={dataSource} />
            </div>
          )}
        </div>
      );
    }
    
    // Render jawaban akhir menggunakan ReactMarkdown dengan link handling
    return (
        <div className="prose prose-sm max-w-none prose-p:my-2">
            <ReactMarkdown 
              components={{
                // Custom link renderer untuk external links
                a: ({ href, children, ...props }) => (
                  <a 
                    href={href} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                    {...props}
                  >
                    {children}
                    <ExternalLink size={12} />
                  </a>
                )
              }}
            >
              {text}
            </ReactMarkdown>
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
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const messagesEndRef = useRef(null);

  // --- KONFIGURASI API KEY ---
  const apiKey = import.meta.env.VITE_CHATBOT_API_KEY;
  const baseURL = import.meta.env.VITE_CHATBOT_API_BASE_URL;

  // Hasilkan ID sesi unik saat komponen pertama kali dimuat
  useEffect(() => {
    setSessionId(crypto.randomUUID());

    let initialMessage = 'Halo! Saya adalah Po\' Tata, siap membantu kamu memberikan informasi terkait DKI Jakarta. Semua data yang saya berikan bersumber dari portal resmi Satu Data Jakarta.';
    if (!apiKey) {
        initialMessage = 'Error: API Key belum diatur di dalam kode App.jsx. Silakan hubungi administrator.';
    }
    setMessages([
        { sender: 'bot', text: initialMessage }
    ]);

    setConnectionStatus('connected');
  }, [apiKey]);

  // Scroll ke pesan terakhir setiap kali ada pesan baru
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !apiKey) return;

    const userMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setConnectionStatus('loading');
    
    try {
        const response = await fetch(`${baseURL}/chat/stream`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': apiKey // Tambahkan header API Key di sini
            },
            body: JSON.stringify({ session_id: sessionId, message: input }),
        });

        if (!response.ok || !response.body) {
            throw new Error(`Network response was not ok: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const processText = ({ done, value }) => {
            if (done) {
                setIsLoading(false);
                setConnectionStatus('connected');
                return;
            }
            
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n\n');
            buffer = parts.pop();

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
        setMessages(prev => [...prev, { 
          sender: 'bot', 
          text: 'Maaf, terjadi kesalahan koneksi ke server. Pastikan server chatbot berjalan di http://localhost:8000' 
        }]);
        setIsLoading(false);
        setConnectionStatus('error');
    }
  };
  
  const handleServerEvent = (data) => {
    if (data.type === 'session_info') {
      const sessionMessage = {
        id: crypto.randomUUID(),
        sender: 'bot',
        type: 'session_info',
        session_info: {
          session_id: data.session_id,
          message_count: data.message_count
        },
        text: `Session info: ${data.session_id}`
      };
      setMessages(prev => [...prev, sessionMessage]);
    } else if (data.type === 'tool_call') {
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
        tool_data: { 
          name: data.tool_name, 
          content: data.content,
          data_source: data.data_source // Include data source dari enhanced stream
        },
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
      setConnectionStatus('connected');
    } else if (data.type === 'error') {
        const errorMessage = {
            id: crypto.randomUUID(),
            sender: 'bot',
            text: `❌ **Error**: ${data.message || data.content}\n\n${data.code ? `**Error Code**: ${data.code}` : ''}`
        };
        setMessages(prev => [...prev, errorMessage]);
        setIsLoading(false);
        setConnectionStatus('error');
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'loading': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Terhubung';
      case 'loading': return 'Memproses...';
      case 'error': return 'Error';
      default: return 'Menghubungkan...';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      <header className="bg-white border-b border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <h1 className="text-xl font-bold text-gray-800">Po' Tata - Chatbot Satu Data Jakarta</h1>
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
            <span className="text-gray-600">{getStatusText()}</span>
          </div>
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          {messages.map((msg, index) => (
            <ChatMessage key={msg.id || index} message={msg} />
          ))}
          {isLoading && (
            <div className="flex items-start gap-3 my-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
                <Bot size={20} />
              </div>
              <div className="p-3 rounded-lg bg-gray-100 text-gray-800 rounded-tl-none flex items-center">
                <Loader className="animate-spin w-5 h-5 text-blue-500" />
                <span className="ml-2 text-sm text-gray-500">Po' Tata sedang berpikir...</span>
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
              placeholder="Tanya seputar data DKI Jakarta..."
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              disabled={isLoading || !apiKey}
            />
            <button
              type="submit"
              className="bg-blue-500 text-white p-3 rounded-lg disabled:bg-blue-300 hover:bg-blue-600 transition-colors flex items-center justify-center"
              disabled={isLoading || !apiKey}
            >
              <Send size={20} />
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Semua data bersumber dari{' '}
            <a href="https://satudata.jakarta.go.id" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              portal resmi Satu Data Jakarta
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;