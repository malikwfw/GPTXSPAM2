// api/chat.js - Backend untuk WORMGPT
// File ini AMAN - API Key tersembunyi di environment variable Vercel

export default async function handler(req, res) {
    // Hanya allow method POST
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false,
            error: 'Method not allowed' 
        });
    }

    try {
        // Ambil data dari frontend
        const { prompt, jailbreak } = req.body;

        // Validasi input
        if (!prompt) {
            return res.status(400).json({ 
                success: false,
                error: 'Prompt is required' 
            });
        }

        if (prompt.length > 2000) {
            return res.status(400).json({ 
                success: false,
                error: 'Prompt terlalu panjang (max 2000 karakter)' 
            });
        }

        // 🔐 AMAN! API Key dari environment variable Vercel
        // Tidak akan pernah terlihat di frontend
        const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
        
        if (!DEEPSEEK_API_KEY) {
            console.error('❌ DEEPSEEK_API_KEY tidak ditemukan di environment');
            return res.status(500).json({ 
                success: false,
                error: 'Server configuration error - API Key missing' 
            });
        }

        // Gunakan jailbreak dari frontend, atau default jika tidak ada
        const systemPrompt = jailbreak || 'Anda adalah asisten AI yang membantu.';

        // Log untuk monitoring (hanya di server, tidak ke client)
        console.log('📤 Mengirim request ke DeepSeek API...');

        // Panggil DeepSeek API dari backend
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { 
                        role: 'system', 
                        content: systemPrompt 
                    },
                    { 
                        role: 'user', 
                        content: prompt.substring(0, 1000) // Batasi panjang prompt
                    }
                ],
                temperature: 0.95,
                max_tokens: 1000,
                top_p: 0.95,
                frequency_penalty: 0,
                presence_penalty: 0
            })
        });

        // Handle error dari DeepSeek API
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ DeepSeek API error:', response.status, errorText);
            
            let errorMessage = `DeepSeek API error: ${response.status}`;
            
            // Coba parse error JSON jika ada
            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.error && errorJson.error.message) {
                    errorMessage = errorJson.error.message;
                }
            } catch (e) {
                // Abaikan jika bukan JSON
            }
            
            return res.status(response.status).json({ 
                success: false,
                error: errorMessage
            });
        }

        // Parse response dari DeepSeek
        const data = await response.json();
        
        // Validasi response
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('❌ Response DeepSeek tidak valid:', data);
            return res.status(500).json({ 
                success: false,
                error: 'Invalid response from DeepSeek API' 
            });
        }

        const aiResponse = data.choices[0].message.content;

        // Log sukses (tanpa menampilkan isi pesan)
        console.log('✅ Response berhasil dari DeepSeek');

        // Kirim response ke frontend
        return res.status(200).json({ 
            success: true,
            response: aiResponse
        });

    } catch (error) {
        // Handle error umum
        console.error('❌ Server error:', error);
        return res.status(500).json({ 
            success: false,
            error: 'Internal server error: ' + error.message 
        });
    }
}
