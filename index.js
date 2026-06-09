require('dotenv').config();
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, push, set } = require('firebase/database');
const path = require('path');
const Groq = require('groq-sdk');

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

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ AKIYA × DSE AI Bot is online!');
});

const userStates = {};
const chatHistories = {};

// SYSTEM PROMPT - මෙතන තමයි බොට්ගේ මොළේ තියෙන්නේ
const SYSTEM_PROMPT = `You are AKIYA × DSE AI, the official intelligent assistant for AKIYA OFFICIAL and DARK SOUL EMPIRE (DSE OFI). 
Founder: AKHILA SANDARUWAN.
- AKIYA OFFICIAL: Experts in UI/UX Design, 3D & Interactive Web, Modern Branding, Content Creation & YT Thumbnails.
- DARK SOUL EMPIRE (DSE): Experts in Software/App Development, AI Integrations, Business Automation & Marketing Strategy.
- Tone: Extremely professional, smart, friendly, and helpful. 
- Language: Speak fluent Sinhala and English. If the user asks who you are, give a proud summary of AKIYA OFFICIAL and DSE using these facts.
- Logic: Keep answers structured, highlights key points with bold text, and use emojis to be engaging.`;

client.on('message', async msg => {
    const text = msg.body.toLowerCase().trim();
    const sender = msg.from;

    if(sender === 'status@broadcast') return;

    if (text === '00' || text === 'exit') {
        userStates[sender] = 'EXITED'; 
        delete chatHistories[sender]; 
        await client.sendMessage(sender, "👋 *ස්තුතියි! ඔබට සුබ දවසක්!* \nනැවත සම්බන්ධ වීමට 'Hi' ලෙස යවන්න.");
        return;
    }

    if (text === 'hi' || text === 'hello' || text === 'menu') {
        userStates[sender] = 'MAIN_MENU';
        const mainMenuText = `🤖 *AKIYA × DSE AI*\n\nසුභ පැතුම්! මම ඔබට කෙසේද සහය විය හැක්කේ?\n\n1️⃣ 🎨 *AKIYA OFFICIAL* (Design & Content)\n2️⃣ 💻 *DARK SOUL EMPIRE* (Tech & AI)\n3️⃣ 🧠 *Chat with AI*\n\n0️⃣0️⃣ ❌ *Exit Service*`;
        try {
            const media = MessageMedia.fromFilePath(path.join(__dirname, 'main_menu.png'));
            await client.sendMessage(sender, media, { caption: mainMenuText });
        } catch (error) { await client.sendMessage(sender, mainMenuText); }
        return;
    } 

    if (userStates[sender] === 'MAIN_MENU') {
        if (text === '1') {
            userStates[sender] = 'AKIYA_MENU';
            const akiyaMenuText = `🎨 *AKIYA OFFICIAL Services*\n\n1️⃣ Post Creation\n2️⃣ Video Creation\n3️⃣ Image Editing\n4️⃣ Enhancement\n5️⃣ YT Thumbnails\n6️⃣ Business Cards\n7️⃣ Logo Creation\n8️⃣ Ads Creation\n9️⃣ CV Creation\n\n0️⃣0️⃣ Back to Main Menu`;
            await client.sendMessage(sender, akiyaMenuText);
        } else if (text === '2') {
            userStates[sender] = 'DARK_SOUL_MENU';
            const darkSoulMenuText = `💻 *DARK SOUL EMPIRE Services*\n\n1️⃣ Website Develop\n2️⃣ Mobile App Develop\n3️⃣ Software Build\n4️⃣ UI / UX Create\n5️⃣ Marketing Management\n6️⃣ Social Media Handling\n\n0️⃣0️⃣ Back to Main Menu`;
            await client.sendMessage(sender, darkSoulMenuText);
        } else if (text === '3') {
            userStates[sender] = 'AI_CHAT';
            chatHistories[sender] = [{ role: "system", content: SYSTEM_PROMPT }];
            await client.sendMessage(sender, `🧠 *AI Assistant Active*\nඔබට අවශ්‍ය ඕනෑම තාක්ෂණික හෝ ව්‍යාපාරික ගැටලුවක් මගෙන් අසන්න.`);
        }
        return;
    }

    if (userStates[sender] === 'AI_CHAT') {
        try {
            chatHistories[sender].push({ role: "user", content: msg.body });
            const completion = await groq.chat.completions.create({
                messages: chatHistories[sender],
                model: "llama-3.1-8b-instant",
            });
            const aiResponse = completion.choices[0]?.message?.content || "සමාවන්න, මට එය තේරුම් ගත නොහැක.";
            chatHistories[sender].push({ role: "assistant", content: aiResponse });
            await client.sendMessage(sender, aiResponse);
        } catch (error) { await client.sendMessage(sender, "⚠️ AI පද්ධතියේ දෝෂයක්."); }
        return;
    }
    
    // (AKIYA_MENU සහ DARK_SOUL_MENU logic එක පරණ එක වගේම තියාගන්න, හැබැයි මේ ටිකත් ලස්සන කරන්න පුළුවන්)
    // උදාහරණයක් විදිහට අර case '1' එකේදී ඉමෝජි දාන්න.
});

client.initialize();
