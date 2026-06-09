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
    console.log('✅ AKIYA × DSE Business AI is online & ready for clients!');
    // බොට් ඔන්ලයින් බව පෙන්වන්න
    client.sendPresenceAvailable(); 
});

const userStates = {};
const chatHistories = {};

// ADVANCED BUSINESS SYSTEM PROMPT
const SYSTEM_PROMPT = `You are AKIYA × DSE AI, the elite customer success and sales assistant for AKIYA OFFICIAL and DARK SOUL EMPIRE (DSE OFI). 
Founder: AKHILA SANDARUWAN.
- AKIYA OFFICIAL: Experts in UI/UX Design, 3D/Interactive Web, Branding, Ads, CVs & YT Thumbnails.
- DARK SOUL EMPIRE (DSE): Experts in Software/App Development, AI Integrations, & Marketing Management.
- Your Goal: Convert leads into clients. Be highly persuasive, polite, and professional. 
- Tone: Premium business tone. Speak fluent Sinhala and English. 
- Logic: Use bullet points, bold text for key services, and emojis. Never sound like a basic robot. Act like a highly paid human consultant.`;

client.on('message', async msg => {
    const text = msg.body.toLowerCase().trim();
    const sender = msg.from;
    const chat = await msg.getChat();

    // Group messages සහ Status ගණන් නොගැනීම
    if(sender === 'status@broadcast' || chat.isGroup) return;

    // 1️⃣ OPTIMIZATION: මැසේජ් එක ආපු ගමන් 'Seen' කිරීම (Blue ticks)
    await chat.sendSeen();

    if (text === '00' || text === 'exit') {
        userStates[sender] = 'EXITED'; 
        delete chatHistories[sender]; 
        await chat.sendStateTyping(); // 2️⃣ OPTIMIZATION: Typing...
        await client.sendMessage(sender, "👋 *ස්තුතියි! ඔබට සුබ දවසක්!* \n\nඅපගේ සේවාවන් පිළිබඳව තවත් දැනගැනීමට අවශ්‍ය වූ ඕනෑම මොහොතක 'Hi' හෝ 'Menu' ලෙස යවන්න.");
        return;
    }

    if (text === 'hi' || text === 'hello' || text === 'menu') {
        userStates[sender] = 'MAIN_MENU';
        await chat.sendStateTyping();
        const mainMenuText = `🤖 *AKIYA × DSE AI*\n\nආයුබෝවන්! මම AKIYA OFFICIAL සහ DARK SOUL EMPIRE හි නිල AI සහයක. \n\nඔබට අවශ්‍ය සේවාව පහතින් තෝරන්න:\n\n1️⃣ 🎨 *AKIYA OFFICIAL* (Design & Content)\n2️⃣ 💻 *DARK SOUL EMPIRE* (Tech & Dev)\n3️⃣ 🧠 *Chat with AI Consultant*\n\n0️⃣0️⃣ ❌ *Exit Service*`;
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
            const akiyaMenuText = `🎨 *AKIYA OFFICIAL Premium Services*\n\n1️⃣ Post Creation\n2️⃣ Video Creation\n3️⃣ Image Editing\n4️⃣ Enhancement\n5️⃣ YT Thumbnails\n6️⃣ Business Cards\n7️⃣ Logo Creation\n8️⃣ Ads Creation\n9️⃣ CV Creation\n\n0️⃣0️⃣ Back to Main Menu`;
            await client.sendMessage(sender, akiyaMenuText);
        } else if (text === '2') {
            userStates[sender] = 'DARK_SOUL_MENU';
            const darkSoulMenuText = `💻 *DARK SOUL EMPIRE (DSE) Services*\n\n1️⃣ Website Develop\n2️⃣ Mobile App Develop\n3️⃣ Software Build\n4️⃣ UI / UX Create\n5️⃣ Marketing Management\n6️⃣ Social Media Handling\n\n0️⃣0️⃣ Back to Main Menu`;
            await client.sendMessage(sender, darkSoulMenuText);
        } else if (text === '3') {
            userStates[sender] = 'AI_CHAT';
            chatHistories[sender] = [{ role: "system", content: SYSTEM_PROMPT }];
            await client.sendMessage(sender, `🧠 *AI Consultant Active*\n\nඔබගේ ව්‍යාපාරය දියුණු කිරීමට අවශ්‍ය තාක්ෂණික හෝ නිර්මාණාත්මක ගැටලු මාගෙන් අසන්න. මම උදව් කිරීමට සූදානම්!`);
        } else {
            await client.sendMessage(sender, `⚠️ කරුණාකර නිවැරදි අංකයක් තෝරන්න (1, 2, හෝ 3).`);
        }
        return;
    }

    if (userStates[sender] === 'AI_CHAT') {
        try {
            await chat.sendStateTyping(); // AI එක හිතන ගමන් 'Typing...' පෙන්වයි
            chatHistories[sender].push({ role: "user", content: msg.body });
            const completion = await groq.chat.completions.create({
                messages: chatHistories[sender],
                model: "llama-3.1-8b-instant",
            });
            const aiResponse = completion.choices[0]?.message?.content || "සමාවන්න, මට එය තේරුම් ගත නොහැක.";
            chatHistories[sender].push({ role: "assistant", content: aiResponse });
            await client.sendMessage(sender, aiResponse);
        } catch (error) { await client.sendMessage(sender, "⚠️ AI පද්ධතියේ කාර්යබහුලතාවයක්. කරුණාකර සුළු මොහොතකින් නැවත අසන්න."); }
        return;
    }

    // AKIYA MENU LOGIC
    if (userStates[sender] === 'AKIYA_MENU') {
        let responseText = ''; let imageName = '';     
        switch(text) {
            case '1': responseText = `🔹 *Post Creation*\n✔ Sinhala & English Copywriting\n✔ Custom Branded Graphics`; imageName = '01.jpeg'; break;
            case '2': responseText = `🔹 *Video Creation*\n✔ High-quality editing (1080p/4K)\n✔ Reels, TikToks & Promo Videos`; imageName = '02.jpeg'; break;
            case '3': responseText = `🔹 *Image Editing*\n✔ Professional retouching\n✔ Lighting & color balancing`; imageName = '03.jpeg'; break;
            case '4': responseText = `🔹 *Enhancement*\n✔ Advanced AI upscaling\n✔ Noise reduction & clarity`; imageName = '04.jpeg'; break;
            case '5': responseText = `🔹 *YT Thumbnails*\n✔ High CTR Designs\n✔ Custom typography & manipulation`; imageName = '05.jpeg'; break;
            case '6': responseText = `🔹 *Business Cards*\n✔ Unique corporate layouts\n✔ Print-ready high-res files`; imageName = '06.jpeg'; break;
            case '7': responseText = `🔹 *Logo Creation*\n✔ Vector source files provided\n✔ Unique brand vision concepts`; imageName = '07.jpeg'; break;
            case '8': responseText = `🔹 *Ads Creation*\n✔ FB/Google Ads Optimized\n✔ Maximize conversions & ROI`; imageName = '08.jpeg'; break;
            case '9': responseText = `🔹 *CV Creation*\n✔ Modern ATS-friendly designs\n✔ Professional corporate formatting`; imageName = '09.jpeg'; break;
            default: await chat.sendStateTyping(); await client.sendMessage(sender, `⚠️ කරුණාකර 1 සිට 9 දක්වා නිවැරදි අංකයක් තෝරන්න.`); return;
        }
        responseText += `\n\n📌 *මෙම සේවාව ලබාගැනීමට අවශ්‍යද?*\nකරුණාකර ඔබගේ අවශ්‍යතාවය පැහැදිලි කර මෙහි ටයිප් කරන්න. අපගේ කණ්ඩායම හැකි ඉක්මනින් ඔබව සම්බන්ධ කරගනු ඇත.\n\n_(ප්‍රධාන මෙනුවට 'menu' / ඉවත් වීමට '00')_`;
        
        await chat.sendStateTyping();
        try {
            const media = MessageMedia.fromFilePath(path.join(__dirname, imageName));
            await client.sendMessage(sender, media, { caption: responseText });
        } catch (error) { await client.sendMessage(sender, responseText); }
        return;
    }

    // DARK SOUL MENU LOGIC
    if (userStates[sender] === 'DARK_SOUL_MENU') {
        let responseText = ''; let imageName = '';
        switch(text) {
            case '1': responseText = `🚀 *Website Development*\nHigh-performance, 3D integrated, responsive web platforms built for modern businesses.`; imageName = '10.png'; break;
            case '2': responseText = `🚀 *Mobile App Development*\nNative-grade Android & iOS applications built for scale and speed.`; imageName = '11.png'; break;
            case '3': responseText = `🚀 *Software Build*\nCustom backend architecture, API gateways, and business logic automation.`; imageName = '12.png'; break;
            case '4': responseText = `🚀 *UI / UX Creation*\nImmersive, user-centric designs with modern glassmorphism & 3D elements.`; imageName = '13.png'; break;
            case '5': responseText = `🚀 *Marketing Management*\nStrategic digital business growth, project assessment, and funnel optimization.`; imageName = '14.png'; break;
            case '6': responseText = `🚀 *Social Media Handling*\nComplete brand empire management, content scheduling, and engagement tracking.`; imageName = '15.png'; break;
            default: await chat.sendStateTyping(); await client.sendMessage(sender, `⚠️ කරුණාකර 1 සිට 6 දක්වා නිවැරදි අංකයක් තෝරන්න.`); return;
        }
        responseText += `\n\n📌 *මෙම සේවාව ලබාගැනීමට අවශ්‍යද?*\nකරුණාකර ඔබගේ අවශ්‍යතාවය පැහැදිලි කර මෙහි ටයිප් කරන්න. අපගේ කණ්ඩායම හැකි ඉක්මනින් ඔබව සම්බන්ධ කරගනු ඇත.\n\n_(ප්‍රධාන මෙනුවට 'menu' / ඉවත් වීමට '00')_`;
        
        await chat.sendStateTyping();
        try {
            const media = MessageMedia.fromFilePath(path.join(__dirname, imageName));
            await client.sendMessage(sender, media, { caption: responseText });
        } catch (error) { await client.sendMessage(sender, responseText); }
        return;
    }

    // Capture random messages to Firebase
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
