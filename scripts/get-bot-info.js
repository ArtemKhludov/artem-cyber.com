// Скрипт для получения информации о Telegram боте
const BOT_TOKEN = '8289281549:AAHnCv4FRz62TBJN-wjPdt_kZ6T3tBj-sgY';

async function getBotInfo() {
    try {
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
        const data = await response.json();

        if (data.ok) {
            console.log('Информация о боте:');
            console.log('Username:', data.result.username);
            console.log('First name:', data.result.first_name);
            console.log('ID:', data.result.id);
            console.log('Can join groups:', data.result.can_join_groups);
            console.log('Can read all group messages:', data.result.can_read_all_group_messages);
            console.log('Supports inline queries:', data.result.supports_inline_queries);

            return data.result;
        } else {
            console.error('Ошибка получения информации о боте:', data.description);
        }
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

// Запуск скрипта
getBotInfo();
