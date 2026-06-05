require('dotenv').config(); 
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, push, set } = require('firebase/database');
const path = require('path');
const Groq = require('groq-sdk');

// 1. Groq Setup
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// 2. Firebase Configuration
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

// 3. WhatsApp Client Setup - Sandbox FIX HERE
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('ඔයාගේ WhatsApp එකෙන් මේ QR Code එක Scan කරන්න!');
});

client.on('ready', () => {
    console.log('✅ Bot is Ready! AKIYA, DARK SOUL & GROQ AI Bot is online.');
});

// State Management Objects
const userStates = {};
const chatHistories = {};

// 4. Message Handling Logic
client.on('message', async msg => {
    const text = msg.body.toLowerCase().trim();
    const sender = msg.from;

    if(sender === 'status@broadcast') return;

    if (text === '00' || text === 'exit') {
        userStates[sender] = 'EXITED'; 
        delete chatHistories[sender]; 
        const exitMsg = `අප හා සම්බන්ධ වූවාට ස්තුතියි. ඔබට සුබ දවසක්! ✨\n\n_(නැවත අපගේ සේවාවන් සමඟ සම්බන්ධ වීමට ඕනෑම මොහොතක 'Hi' හෝ 'Menu' ලෙස යවන්න)_`;
        await client.sendMessage(sender, exitMsg);
        return;
    }

    if (text === 'hi' || text === 'hello' || text === 'menu') {
        userStates[sender] = 'MAIN_MENU';
        const mainMenuText = `👋 *Welcome to Our Services!*\n\nකරුණාකර ඔබට අවශ්‍ය සේවාව තෝරන්න:\n\n*1.* 🎨 AKIYA OFFICIAL\n*2.* 💻 DARK SOUL EMPIRE\n*3.* 🤖 Chat to AI\n*00.* ❌ සේවාවෙන් ඉවත් වීමට\n\n_(අදාළ අංකය පමණක් Reply කරන්න)_`;
        try {
            const media = MessageMedia.fromFilePath(path.join(__dirname, 'main_menu.png'));
            await client.sendMessage(sender, media, { caption: mainMenuText });
        } catch (error) { await client.sendMessage(sender, mainMenuText); }
        return;
    } 

    if (userStates[sender] === 'EXITED') {
        saveInquiryToFirebase(sender, msg.body);
        return;
    }
    
    if (userStates[sender] === 'MAIN_MENU') {
        if (text === '1') {
            userStates[sender] = 'AKIYA_MENU';
            const akiyaMenuText = `🎨 *AKIYA OFFICIAL Services:*\n\n1. Post Creation\n2. Video Creation\n3. Image Editing\n4. Enhancement\n5. YT Thumbnails\n6. Business Cards\n7. Logo Creation\n8. Ads Creation\n9. CV Creation\n\n*00.* ❌ සේවාවෙන් ඉවත් වීමට\n\n_(කරුණාකර ඔබට විස්තර දැනගැනීමට අවශ්‍ය සේවාවේ අංකය Reply කරන්න)_`;
            try {
                const media = MessageMedia.fromFilePath(path.join(__dirname, 'akiya_menu.png'));
                await client.sendMessage(sender, media, { caption: akiyaMenuText });
            } catch (error) { await client.sendMessage(sender, akiyaMenuText); }
        } 
        else if (text === '2') {
            userStates[sender] = 'DARK_SOUL_MENU';
            const darkSoulMenuText = `💻 *DARK SOUL EMPIRE Services:*\n\n1. Website Develop\n2. Mobile App Develop\n3. Software Build\n4. UI / UX Create\n5. Marketing Management\n6. Social Media Handling\n\n*00.* ❌ සේවාවෙන් ඉවත් වීමට\n\n_(කරුණාකර ඔබට විස්තර දැනගැනීමට අවශ්‍ය සේවාවේ අංකය Reply කරන්න)_`;
            try {
                const media = MessageMedia.fromFilePath(path.join(__dirname, 'dark_soul_menu.png'));
                await client.sendMessage(sender, media, { caption: darkSoulMenuText });
            } catch (error) { await client.sendMessage(sender, darkSoulMenuText); }
        }
        else if (text === '3') {
            userStates[sender] = 'AI_CHAT';
            chatHistories[sender] = [
                { role: "system", content: "You are a friendly and helpful AI assistant representing AKIYA OFFICIAL and DARK SOUL EMPIRE. You speak both Sinhala and English fluently. Keep your answers short and concise." }
            ];
            await client.sendMessage(sender, `🤖 *AI Assistant*\n\nඔබට අවශ්‍ය ඕනෑම දෙයක් මාගෙන් අසන්න. මම උදව් කරන්නම්!\n\n_(ප්‍රධාන මෙනුවට 'Menu' ලෙස හෝ ඉවත් වීමට '00' යවන්න)_`);
        }
        else {
            await client.sendMessage(sender, `කරුණාකර නිවැරදි අංකයක් තෝරන්න (1, 2, හෝ 3). නැතහොත් ඉවත් වීමට '00' යවන්න.`);
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
            const aiResponse = completion.choices[0]?.message?.content || "කණගාටුයි, මට එය තේරුම් ගත නොහැකි විය.";
            chatHistories[sender].push({ role: "assistant", content: aiResponse });
            await client.sendMessage(sender, aiResponse);
        } catch (error) {
            console.error("Groq Error: ", error);
            await client.sendMessage(sender, "⚠️ AI පද්ධතියේ දෝෂයක්. කරුණාකර පසුව උත්සාහ කරන්න.");
        }
        return;
    }

    if (userStates[sender] === 'AKIYA_MENU') {
        let responseText = ''; let imageName = '';     
        switch(text) {
            case '1': responseText = `*Post Creation*\n✔ Sinhala & English\n✔ Custom graphics`; imageName = '01.jpeg'; break;
            case '2': responseText = `*Video Creation*\n✔ High-quality editing\n✔ Short & long-form`; imageName = '02.jpeg'; break;
            case '3': responseText = `*Image Editing*\n✔ Professional retouching\n✔ Lighting & color balancing`; imageName = '03.jpeg'; break;
            case '4': responseText = `*Enhancement*\n✔ Advanced AI upscaling\n✔ Noise reduction`; imageName = '04.jpeg'; break;
            case '5': responseText = `*YT Thumbnails*\n✔ Proven to increase CTR\n✔ Custom typography`; imageName = '05.jpeg'; break;
            case '6': responseText = `*Business Cards*\n✔ Unique customized layout\n✔ High-res print files`; imageName = '06.jpeg'; break;
            case '7': responseText = `*Logo Creation*\n✔ Vector source files\n✔ Unique brand vision`; imageName = '07.jpeg'; break;
            case '8': responseText = `*Ads Creation*\n✔ FB/Google Optimized\n✔ Maximize clicks & ROI`; imageName = '08.jpeg'; break;
            case '9': responseText = `*CV Creation*\n✔ ATS-friendly design\n✔ Professional formatting`; imageName = '09.jpeg'; break;
            default: await client.sendMessage(sender, `කරුණාකර 1 සිට 9 දක්වා නිවැරදි අංකයක් තෝරන්න. (ඉවත් වීමට '00' යවන්න)`); return;
        }
        responseText += `\n\nඔබට මෙම සේවාව ලබාගැනීමට අවශ්‍ය නම්, කරුණාකර ඔබගේ අවශ්‍යතාවය පැහැදිලි කර මෙහි ටයිප් කරන්න. අපගේ නියෝජිතයෙකු ඉක්මනින් ඔබව සම්බන්ධ කරගනු ඇත.\n\n_(ප්‍රධාන මෙනුවට 'menu' / ඉවත් වීමට '00')_`;
        try {
            const media = MessageMedia.fromFilePath(path.join(__dirname, imageName));
            await client.sendMessage(sender, media, { caption: responseText });
        } catch (error) { await client.sendMessage(sender, responseText); }
        return;
    }

    if (userStates[sender] === 'DARK_SOUL_MENU') {
        let responseText = ''; let imageName = '';
        switch(text) {
            case '1': responseText = `*Website Develop*\nHigh-performance, 3D integrated web platforms for modern businesses.`; imageName = '10.png'; break;
            case '2': responseText = `*Mobile App Develop*\nNative-grade cross-platform applications built for scale.`; imageName = '11.png'; break;
            case '3': responseText = `*Software Build*\nCustom backend architecture and business logic automation.`; imageName = '12.png'; break;
            case '4': responseText = `*UI / UX Create*\nImmersive, user-centric designs that drive engagement.`; imageName = '13.png'; break;
            case '5': responseText = `*Marketing Management*\nStrategic business growth.\nProject Assessment`; imageName = '14.png'; break;
            case '6': responseText = `*Social Media Handling*\nEmpire management.\nTime Assessment`; imageName = '15.png'; break;
            default: await client.sendMessage(sender, `කරුණාකර 1 සිට 6 දක්වා නිවැරදි අංකයක් තෝරන්න. (ඉවත් වීමට '00' යවන්න)`); return;
        }
        responseText += `\n\nඔබට මෙම සේවාව ලබාගැනීමට අවශ්‍ය නම්, කරුණාකර ඔබගේ අවශ්‍යතාවය පැහැදිලි කර මෙහි ටයිප් කරන්න. අපගේ නියෝජිතයෙකු ඉක්මනින් ඔබව සම්බන්ධ කරගනු ඇත.\n\n_(ප්‍රධාන මෙනුවට 'menu' / ඉවත් වීමට '00')_`;
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
