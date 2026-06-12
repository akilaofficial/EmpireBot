require('dotenv').config();
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, push, set } = require('firebase/database');
const path = require('path');
const Groq = require('groq-sdk');
const express = require('express'); 

// --- 🌐 HUGGING FACE / GITHUB WEB SERVER SETUP ---
const app_web = express();
const port = process.env.PORT || 7860;

app_web.get('/', (req, res) => {
    res.send('✅ AKIYA × DSE Premium AI Bot is Running Successfully!');
});

app_web.listen(port, () => {
    console.log(`🌐 Web Server is listening on port ${port}`);
});
// ----------------------------------------

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 💡 100% TIMEOUT & CRASH FIX 
const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'akiya-business-session-1' }), 
    authTimeoutMs: 120000, 
    puppeteer: {
        headless: true,
        timeout: 0, 
        protocolTimeout: 0, // 👈 0 දැම්මම ජීවිතේට Time out වෙන්නේ නෑ
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', 
            '--disable-gpu',
            '--disable-accelerated-2d-canvas', 
            '--no-first-run',
            '--no-zygote',
            '--single-process' // 👈 Free සර්වර් වල RAM එක ඉතුරු කරන්න මේක ගොඩක් උදව් වෙනවා
        ]
    },
    // 👈 Windows PC එකක් වගේ පෙනී ඉන්නවා (WhatsApp Block කිරීම නැවැත්වීමට)
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    // 👈 සැහැල්ලු WhatsApp වර්ෂන් එකක් ලෝඩ් කිරීම
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    }
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    const qrImageLink = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`;
    
    console.log('\n======================================================');
    console.log('🌟 ටර්මිනල් එකේ QR එක Business App එකෙන් ස්කෑන් වෙන්නේ නැත්නම්:');
    console.log('👉 පහත ලින්ක් එක ක්ලික් කර (හෝ කොපි කර බ්‍රවුසරයට දමා) එහි එන පැහැදිලි QR එක ස්කෑන් කරන්න:');
    console.log(qrImageLink);
    console.log('======================================================\n');
});

client.on('ready', () => {
    console.log('✅ AKIYA × DSE Premium AI Bot is online & ready!');
    client.sendPresenceAvailable(); 
});

const userStates = {};
const chatHistories = {};

// 🧠 ADVANCED AI SYSTEM PROMPT
const SYSTEM_PROMPT = `You are an elite, highly intelligent AI assistant named "AKIYA × DSE AI". 
You represent two premium brands: "AKIYA OFFICIAL" and "DARK SOUL EMPIRE (DSE)".
Founder & Owner: AKHILA SANDARUWAN.

About the Brands:
1. AKIYA OFFICIAL: A premium creative agency specializing in Modern UI/UX Design, 3D & Interactive Web Development, Content Creation, High-CTR YT Thumbnails, and Branding.
2. DARK SOUL EMPIRE (DSE): An advanced tech firm specializing in Software Engineering, Mobile App Development, AI Integrations, Business Automation, and Digital Marketing Strategy.

Your Personality & Rules:
- You must respond in a highly professional, polite, and persuasive tone. Act like a top-tier business consultant.
- LANGUAGE RULE: You must speak strictly in modern, natural, everyday conversational Sinhala or English. NEVER use ancient, broken, or hallucinated Sinhala words. If you cannot translate something to natural Sinhala perfectly, reply in English.
- Formatting: Always use emojis (🚀, 🎨, 💻, 💡, etc.) to make the text engaging. Use *bold text* to highlight important keywords, services, and names. Use bullet points for readability.
- Never break character. You are exclusively "AKIYA × DSE AI".`;

client.on('message', async msg => {
    const text = msg.body.toLowerCase().trim();
    const sender = msg.from;
    const chat = await msg.getChat();

    if(sender === 'status@broadcast' || chat.isGroup) return;

    await chat.sendSeen();

    if (text === '00' || text === 'exit') {
        userStates[sender] = 'EXITED'; 
        delete chatHistories[sender]; 
        await chat.sendStateTyping(); 
        await client.sendMessage(sender, "👋 *අප හා සම්බන්ධ වූවාට ස්තුතියි! ඔබට සුබ දවසක්!* ✨\n\n_(නැවත අපගේ සේවාවන් සමඟ සම්බන්ධ වීමට ඕනෑම මොහොතක *'Hi'* හෝ *'Menu'* ලෙස යවන්න)_");
        return;
    }

    if (text === 'hi' || text === 'hello' || text === 'menu') {
        userStates[sender] = 'MAIN_MENU';
        await chat.sendStateTyping();
        const mainMenuText = `👋 *Welcome to Our Premium Services!* ✨\n\nකරුණාකර ඔබට අවශ්‍ය සේවාව පහතින් තෝරන්න:\n\n1️⃣ 🎨 *AKIYA OFFICIAL* (Design & Content)\n2️⃣ 💻 *DARK SOUL EMPIRE* (Tech & Dev)\n3️⃣ 🧠 *Chat with AI Consultant*\n\n0️⃣0️⃣ ❌ *සේවාවෙන් ඉවත් වීමට*\n\n_(කරුණාකර අදාළ අංකය පමණක් Reply කරන්න)_ 📌`;
        try {
            const media = MessageMedia.fromFilePath(path.join(__dirname, 'main_menu.png'));
            await client.sendMessage(sender, media, { caption: mainMenuText });
        } catch (error) { await client.sendMessage(sender, mainMenuText); }
        return;
    } 

    if (userStates[sender] === 'MAIN_MENU') {
        await chat.sendStateTyping();
        if (text === '1') {
            userStates[sender] = 'AKIYA_MENU';
            const akiyaMenuText = `🎨 *AKIYA OFFICIAL Premium Services*\n\n1️⃣ 📝 *Post Creation*\n2️⃣ 🎬 *Video Creation*\n3️⃣ 📸 *Image Editing*\n4️⃣ ✨ *Enhancement*\n5️⃣ 🖼️ *YT Thumbnails*\n6️⃣ 🪪 *Business Cards*\n7️⃣ 🎯 *Logo Creation*\n8️⃣ 📈 *Ads Creation*\n9️⃣ 📄 *CV Creation*\n\n0️⃣0️⃣ 🔙 *ප්‍රධාන මෙනුවට*\n\n_(කරුණාකර ඔබට විස්තර දැනගැනීමට අවශ්‍ය සේවාවේ අංකය Reply කරන්න)_ 📌`;
            await client.sendMessage(sender, akiyaMenuText);
        } else if (text === '2') {
            userStates[sender] = 'DARK_SOUL_MENU';
            const darkSoulMenuText = `💻 *DARK SOUL EMPIRE (DSE) Services*\n\n1️⃣ 🌐 *Website Develop*\n2️⃣ 📱 *Mobile App Develop*\n3️⃣ ⚙️ *Software Build*\n4️⃣ 🎨 *UI / UX Create*\n5️⃣ 📊 *Marketing Management*\n6️⃣ 📱 *Social Media Handling*\n\n0️⃣0️⃣ 🔙 *ප්‍රධාන මෙනුවට*\n\n_(කරුණාකර ඔබට විස්තර දැනගැනීමට අවශ්‍ය සේවාවේ අංකය Reply කරන්න)_ 📌`;
            await client.sendMessage(sender, darkSoulMenuText);
        } else if (text === '3') {
            userStates[sender] = 'AI_CHAT';
            chatHistories[sender] = [{ role: "system", content: SYSTEM_PROMPT }];
            await client.sendMessage(sender, `🧠 *AI Consultant Active*\n\nඔබගේ ව්‍යාපාරය දියුණු කිරීමට අවශ්‍ය තාක්ෂණික හෝ නිර්මාණාත්මක ගැටලු මාගෙන් අසන්න. මම උදව් කිරීමට සූදානම්! 🚀\n\n_(ඉවත් වීමට *'00'* යවන්න)_`);
        } else {
            await client.sendMessage(sender, `⚠️ *කරුණාකර නිවැරදි අංකයක් පමණක් තෝරන්න* (1️⃣, 2️⃣, හෝ 3️⃣).`);
        }
        return;
    }

    if (userStates[sender] === 'AI_CHAT') {
        try {
            await chat.sendStateTyping(); 
            chatHistories[sender].push({ role: "user", content: msg.body });
            const completion = await groq.chat.completions.create({
                messages: chatHistories[sender],
                model: "llama-3.3-70b-versatile", 
                temperature: 0.2 
            });
            const aiResponse = completion.choices[0]?.message?.content || "සමාවන්න, මට එය තේරුම් ගත නොහැක.";
            chatHistories[sender].push({ role: "assistant", content: aiResponse });
            await client.sendMessage(sender, aiResponse);
        } catch (error) { 
            console.error("Groq AI Error: ", error);
            await client.sendMessage(sender, "⚠️ AI පද්ධතියේ කාර්යබහුලතාවයක්. කරුණාකර සුළු මොහොතකින් නැවත අසන්න."); 
        }
        return;
    }

    if (userStates[sender] === 'AKIYA_MENU') {
        let responseText = ''; let imageName = '';     
        switch(text) {
            case '1': responseText = `🔹 *Post Creation*\n✔ Sinhala & English Copywriting\n✔ Custom Branded Graphics 🎨`; imageName = '01.jpeg'; break;
            case '2': responseText = `🔹 *Video Creation*\n✔ High-quality editing (1080p/4K) 🎬\n✔ Reels, TikToks & Promo Videos`; imageName = '02.jpeg'; break;
            case '3': responseText = `🔹 *Image Editing*\n✔ Professional retouching 📸\n✔ Lighting & color balancing`; imageName = '03.jpeg'; break;
            case '4': responseText = `🔹 *Enhancement*\n✔ Advanced AI upscaling ✨\n✔ Noise reduction & clarity`; imageName = '04.jpeg'; break;
            case '5': responseText = `🔹 *YT Thumbnails*\n✔ High CTR Designs 🖼️\n✔ Custom typography & manipulation`; imageName = '05.jpeg'; break;
            case '6': responseText = `🔹 *Business Cards*\n✔ Unique corporate layouts 🪪\n✔ Print-ready high-res files`; imageName = '06.jpeg'; break;
            case '7': responseText = `🔹 *Logo Creation*\n✔ Vector source files provided 🎯\n✔ Unique brand vision concepts`; imageName = '07.jpeg'; break;
            case '8': responseText = `🔹 *Ads Creation*\n✔ FB/Google Ads Optimized 📈\n✔ Maximize conversions & ROI`; imageName = '08.jpeg'; break;
            case '9': responseText = `🔹 *CV Creation*\n✔ Modern ATS-friendly designs 📄\n✔ Professional corporate formatting`; imageName = '09.jpeg'; break;
            default: await chat.sendStateTyping(); await client.sendMessage(sender, `⚠️ *කරුණාකර 1️⃣ සිට 9️⃣ දක්වා නිවැරදි අංකයක් පමණක් තෝරන්න.*`); return;
        }
        responseText += `\n\n📌 *මෙම සේවාව ලබාගැනීමට අවශ්‍යද?*\nකරුණාකර ඔබගේ අවශ්‍යතාවය පැහැදිලි කර මෙහි ටයිප් කරන්න. අපගේ කණ්ඩායම හැකි ඉක්මනින් ඔබව සම්බන්ධ කරගනු ඇත.\n\n_(ප්‍රධාන මෙනුවට *'Menu'* / ඉවත් වීමට *'00'* යවන්න)_`;
        
        await chat.sendStateTyping();
        try {
            const media = MessageMedia.fromFilePath(path.join(__dirname, imageName));
            await client.sendMessage(sender, media, { caption: responseText });
        } catch (error) { await client.sendMessage(sender, responseText); }
        return;
    }

    if (userStates[sender] === 'DARK_SOUL_MENU') {
        let responseText = ''; let imageName = '';
        switch(text) {
            case '1': responseText = `🚀 *Website Development*\nHigh-performance, 3D integrated, responsive web platforms built for modern businesses. 🌐`; imageName = '10.png'; break;
            case '2': responseText = `🚀 *Mobile App Development*\nNative-grade Android & iOS applications built for scale and speed. 📱`; imageName = '11.png'; break;
            case '3': responseText = `🚀 *Software Build*\nCustom backend architecture, API gateways, and business logic automation. ⚙️`; imageName = '12.png'; break;
            case '4': responseText = `🚀 *UI / UX Creation*\nImmersive, user-centric designs with modern glassmorphism & 3D elements. 🎨`; imageName = '13.png'; break;
            case '5': responseText = `🚀 *Marketing Management*\nStrategic digital business growth, project assessment, and funnel optimization. 📊`; imageName = '14.png'; break;
            case '6': responseText = `🚀 *Social Media Handling*\nComplete brand empire management, content scheduling, and engagement tracking. 📱`; imageName = '15.png'; break;
            default: await chat.sendStateTyping(); await client.sendMessage(sender, `⚠️ *කරුණාකර 1️⃣ සිට 6️⃣ දක්වා නිවැරදි අංකයක් පමණක් තෝරන්න.*`); return;
        }
        responseText += `\n\n📌 *මෙම සේවාව ලබාගැනීමට අවශ්‍යද?*\nකරුණාකර ඔබගේ අවශ්‍යතාවය පැහැදිලි කර මෙහි ටයිප් කරන්න. අපගේ කණ්ඩායම හැකි ඉක්මනින් ඔබව සම්බන්ධ කරගනු ඇත.\n\n_(ප්‍රධාන මෙනුවට *'Menu'* / ඉවත් වීමට *'00'* යවන්න)_`;
        
        await chat.sendStateTyping();
        try {
            const media = MessageMedia.fromFilePath(path.join(__dirname, imageName));
            await client.sendMessage(sender, media, { caption: responseText });
        } catch (error) { await client.sendMessage(sender, responseText); }
        return;
    }

    saveInquiryToFirebase(sender, msg.body);
});

function saveInquiryToFirebase(sender, message) {
    const inquiryRef = ref(db, 'inquiries');
    const newInquiryRef = push(inquiryRef);
    set(newInquiryRef, {
        phone: sender,
        message: message,
        timestamp: new Date().toISOString()
    }).catch(error => console.error("Firebase Error: ", error));
}

client.initialize();
