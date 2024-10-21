const { Client, GatewayIntentBits,REST, EmbedBuilder,Routes  } = require('discord.js');
const axios = require('axios');
require('dotenv').config();
const dns = require('dns');

// Thiết lập để chỉ sử dụng IPv4
dns.setDefaultResultOrder('ipv4first');

var discordToken = process.env.DISCORD_TOKEN;
var apiKey1 = process.env.API_KEY;
var appId = process.env.APP_ID
var appSecret = process.env.APP_SECRET;
var ggApiKeySecrec = process.env.GG_API_KEY; //
var mApiKeySecrec = process.env.M_API_KEY;

function formatDate(dateString) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`; 
}

function formatRating(title) {
    switch(title){
        case 'exceptional': return "Very positive";break;
        case 'recommended': return "Positive";break;
        case 'meh': return "Mixed";break;
        case 'skip' : return "Negative";break;
        default: return "";
    }
}


const { createCanvas } = require('canvas');


const { Chart, registerables } = require('chart.js');
Chart.register(...registerables);

async function createChart(ratings) {
    const canvas = createCanvas(800, 400); // Kích thước hình ảnh
    const context = canvas.getContext('2d');

      // Vẽ nền cho biểu đồ
      context.fillStyle = '#2A475E'; // Màu nền bạn muốn
      context.fillRect(0, 0, canvas.width, canvas.height); 

    const labels = ratings.map(rating => formatRating(rating.title)); // Danh sách tên xếp hạng
    const data = ratings.map(rating => {
        // Kiểm tra xem đánh giá có tiêu cực hay không
        if (rating.title === 'skip') {
            return -rating.count; // Đổi số lượng thành số âm
        }
        return rating.count; 
    }); 
     

    const backgroundColors = ratings.map(rating => {
        // Đặt màu sắc cho mỗi cột
        switch (rating.title) {
            case 'exceptional':
                return '#66C0F4'; // Màu xanh lá cho đánh giá xuất sắc
            case 'recommended':
                return 'rgba(0, 255, 0, 0.5)'; // Màu cam cho đánh giá được đề xuất
            case 'meh':
                return 'rgba(255, 165, 0, 0.5)'; // Màu vàng cho đánh giá trung lập
            case 'skip':
                return '#A34C25'; // Màu đỏ cho đánh giá tiêu cực
            default:
                return 'rgba(0, 153, 255, 0.5)'; // Màu mặc định
        }
    });

    const chart = new Chart(context, {
        type: 'bar', // Loại biểu đồ
        data: {
            labels: labels,
            datasets: [{
                label: 'SUMMARY OF REVIEWS',
                data: data,
                backgroundColor: backgroundColors, // Sử dụng mảng màu sắc
                borderColor: '',
                borderWidth: 1
            }]
        },
        options: {
            
            plugins: {
                tooltip: {
                    backgroundColor: '#2A475E', // Màu nền của biểu đồ
                    titleFont: {
                    family: 'Roboto', // Chỉ định font cho tooltip
                    size: 16,
                    style: 'bold',
                    lineHeight: 1.2
                },
                bodyFont: {
                    family: 'Roboto', // Chỉ định font cho body tooltip
                    size: 14,
                    lineHeight: 1.2
                }
                },
            },
           
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => value < 0 ? "-" +Math.abs(value) : value ,// Hiển thị giá trị âm là số dương
                        color: '#64BDF0',
                        font: {
                        family: 'Roboto', // Chỉ định font cho trục y
                        size: 14
                        }
                    },
                    grid: {
                        color: '#64BDF0' // Màu của khung lưới cho trục y
                    },
                    title: {
                        display: true,
                        text: 'QUANTITY',
                        color: '#64BDF0' // Đặt màu chữ cho tiêu đề trục y
                    }
                },
                x: {
                    ticks: {
                        color: '#64BDF0', // Đặt màu chữ cho trục x
                        font: {
                        family: 'Roboto', // Chỉ định font cho trục x
                        size: 14
                        }
                    },
                    grid: {
                        color: '#64BDF0' // Màu của khung lưới cho trục y
                    },
                    title: {
                        display: true,
                        text: 'RANKING',
                        color: '#64BDF0' // Đặt màu chữ cho tiêu đề trục x
                    }
                }
            },
            
        }
    });

    return canvas.toBuffer(); // Trả về hình ảnh dưới dạng buffer
}




// Tạo client Discord
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Bot online
client.once('ready', () => {
    console.log('Bot đã sẵn sàng!');
});

// Đăng ký slash command với autocomplete
const rest = new REST({ version: '10' }).setToken(discordToken);

(async () => {
    try {
        console.log('Đang đăng ký (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(appId, appSecret),  // Thay bằng ID ứng dụng và server của bạn
            { body: [
                {
                    name: 'game',
                    description: 'Tìm kiếm thông tin game',
                    options: [
                        {
                            name: 'tên',
                            description: 'Tên game',
                            type: 3,  // Loại string
                            required: true,
                            autocomplete: true  // Bật autocomplete
                        }
                    ]
                }
            ]},
        );

        console.log('Đăng ký thành công (/) commands.');
    } catch (error) {
        console.error('Có lỗi khi đăng ký commands:', error);
    }
})();

client.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
        const { commandName, options } = interaction;
        

        if (commandName === 'game') {
            const gameName = options.getString('tên');
            const ggApiKey = ggApiKeySecrec;
            const ggApiUrl = `https://kgsearch.googleapis.com/v1/entities:search?query=${encodeURIComponent(gameName)}&key=${ggApiKey}&limit=1&indent=True`;
            const apiKey = apiKey1;  // Thay bằng API key của bạn
            const apiUrl = `https://api.rawg.io/api/games?key=${apiKey}&search=${gameName}`;

            try {
                await interaction.deferReply(); 
                const response = await axios.get(apiUrl);
                
                const gameInfo = response.data.results[0];  // Lấy game đầu tiên
                const rs = await axios.get(ggApiUrl);
                const data = rs.data;
                console.log("GOOGLE",data.itemListElement[0].result);
              
                
                

                if (gameInfo) {
                    const chartBuffer = await createChart(gameInfo.ratings); // Tạo hình ảnh biểu đồ
                    const gameDes = data.itemListElement[0].result.detailedDescription.articleBody;
                    const wikiUrl = data.itemListElement[0].result.detailedDescription.url;
                    const tranlated = await translateWithMicrosoft(gameDes,'vi');
                    
                    const embed = new EmbedBuilder()
                        .setColor('#0099ff')
                        .setTitle(gameInfo.name)
                        .setURL(`https://rawg.io/games/${gameInfo.slug}`)
                        .setDescription(tranlated? tranlated: 'Không tìm thấy miêu tả.')
                        .addFields(
                            { name: 'Chi tiết', value: `${wikiUrl ? wikiUrl : 'Không có'}` },
                            { name: 'Ngày phát hành', value: formatDate(gameInfo.released)  || 'Không có', inline: true },
                            { name: 'Xếp hạng', value: `${gameInfo.metacritic ? gameInfo.metacritic+" / 100" : gameInfo.rating+" / 5" || 'Không có'}`, inline: true },
                           
                            { 
                                name: 'Nền tảng', 
                                value: `${gameInfo.platforms ? gameInfo.platforms.map(p => p.platform.name).join(', ') : 'Không có'}`, 
                            },
                            { 
                                name: 'Cửa hàng', 
                                value: `${gameInfo.stores ? gameInfo.stores.map(p => p.store.name).join(', ') : 'Không có'}`, 
                            },
                           

                        );
                      
                        if (gameInfo.genres && gameInfo.genres.length > 0) {
                            const genres = gameInfo.genres.map(genre => genre.name);
                        
                            // Lấy thể loại đầu tiên và gộp các thể loại còn lại
                            const primaryGenre = genres[0]; // Thể loại chính
                            const otherGenres = genres.slice(1).join(', '); // Gộp các thể loại còn lại
                        
                            embed.addFields(
                                { name: 'Thể loại chính', value: primaryGenre, inline: true },
                                { name: 'Các thể loại khác', value: otherGenres || 'Không có', inline: true }
                            );
                        }
                        
                        

                        embed.setImage('attachment://chart.png')
                   
                        embed.setThumbnail(gameInfo.background_image); // Ảnh nền
                        

                    await interaction.followUp({ embeds: [embed] , files: [{ name: 'chart.png', attachment: chartBuffer }] });
                } else {
                    await interaction.followUp('Không tìm thấy game nào.');
                }
            } catch (error) {
                await interaction.followUp('Có lỗi xảy ra khi tìm kiếm thông tin game.');
                console.error(error);
            }
        }
    }

    if (interaction.isAutocomplete()) {
        const focusedValue = interaction.options.getFocused();
        const apiKey = apiKey1;  // API key của bạn
        const apiUrl = `https://api.rawg.io/api/games?key=${apiKey}&search=${focusedValue}`;

        try {
            const response = await axios.get(apiUrl);
            const choices = response.data.results.map(game => ({
                name: game.name,
                value: game.name,
            }));
    
            await interaction.respond(choices);
        } catch (error) {
            console.error(error);
            await interaction.respond([]);
        }
    }
});

async function translateWithMicrosoft(text, targetLang) {
    const mapiKey = mApiKeySecrec;  
    const endpoint = 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0'; // Thay bằng URL endpoint của bạn
    const location = 'southeastasia'; 

    const url = `${endpoint}&to=${targetLang}`;  // Ngôn ngữ đích, ví dụ: 'vi' cho tiếng Việt

    try {
        const responseM = await axios.post(url, [{
            'Text': text,
        }], {
            headers: {
                'Ocp-Apim-Subscription-Key': mapiKey,
                'Ocp-Apim-Subscription-Region': location,
                'Content-Type': 'application/json',
            },
        });

        return responseM.data[0].translations[0].text; 
    } catch (error) {
        console.error('Lỗi khi dịch văn bản:', error);
        return text;  // Trả về văn bản gốc nếu có lỗi
    }
}






// Đăng nhập vào bot bằng token Discord của bạn
client.login(discordToken);
