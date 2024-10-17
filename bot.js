const { Client, GatewayIntentBits,REST, EmbedBuilder,Routes  } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

var discordToken = process.env.DISCORD_TOKEN;
var apiKey1 = process.env.API_KEY;
var appId = process.env.APP_ID
var appSecret = process.env.APP_SECRET;

function formatDate(dateString) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`; 
}

function formatRating(title) {
    switch(title){
        case 'exceptional': return "Rất tích cực";break;
        case 'recommended': return "Tích cực";break;
        case 'meh': return "Mixed";break;
        case 'skip' : return "Tiêu cực";break;
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
                label: 'TỔNG HỢP ĐÁNH GIÁ',
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
                },
            },
           
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => value < 0 ? "-" +Math.abs(value) : value ,// Hiển thị giá trị âm là số dương
                        color: '#64BDF0'
                    },
                    grid: {
                        color: '#64BDF0' // Màu của khung lưới cho trục y
                    },
                    title: {
                        display: true,
                        text: 'SỐ LƯỢNG',
                        color: '#64BDF0' // Đặt màu chữ cho tiêu đề trục y
                    }
                },
                x: {
                    ticks: {
                        color: '#64BDF0' // Đặt màu chữ cho trục x
                    },
                    grid: {
                        color: '#64BDF0' // Màu của khung lưới cho trục y
                    },
                    title: {
                        display: true,
                        text: 'XẾP HẠNG',
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
            const wikiApiUrl = `https://vi.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&titles=${encodeURIComponent(gameName)}&format=json&explaintext`;
            const apiKey = apiKey1;  // Thay bằng API key của bạn
            const apiUrl = `https://api.rawg.io/api/games?key=${apiKey}&search=${gameName}`;

            try {
                await interaction.deferReply(); 
                const response = await axios.get(apiUrl);
                const responseWiki = await axios.get(wikiApiUrl);
                const gameInfo = response.data.results[0];  // Lấy game đầu tiên
                const pages = responseWiki.data.query.pages;
                const page = Object.values(pages)[0];
                console.log(gameInfo);
                

                if (gameInfo) {
                    const chartBuffer = await createChart(gameInfo.ratings); // Tạo hình ảnh biểu đồ
                    const embed = new EmbedBuilder()
                        .setColor('#0099ff')
                        .setTitle(gameInfo.name)
                        .setURL(`https://rawg.io/games/${gameInfo.slug}`)
                        .setDescription(page.extract? page.extract.substring(0, 400) + '...' : 'Không tìm thấy miêu tả.')
                        .addFields(
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




// Lắng nghe tin nhắn
// client.on('messageCreate', async (message) => {
//     // Bỏ qua tin nhắn của bot
//     if (message.author.bot) return;

//     // Kiểm tra nếu tin nhắn bắt đầu với "!game"
//     if (message.content.startsWith('/game')) {
//         // Lấy tên game từ tin nhắn
//         const gameName = message.content.replace('/game', '').trim();

//         // Kiểm tra nếu không có tên game
//         if (!gameName) {
//             return message.channel.send('Vui lòng cung cấp tên game!');
//         }

//         // Gọi API RAWG để lấy thông tin game
//         const apiKey = '33153d876f664c52b6180d903a53088b';  // Thay bằng API key của bạn
//         const apiUrl = `https://api.rawg.io/api/games?key=${apiKey}&search=${gameName}`;

//         try {
//             const response = await axios.get(apiUrl);
//             const gameInfo = response.data.results[0];  // Lấy game đầu tiên từ kết quả tìm kiếm
//             console.log(response.data);
//             if (gameInfo) {
//                 // Tạo Rich Embed với thông tin game
//                 const gameEmbed = new EmbedBuilder()
//                     .setColor('#0099ff')
//                     .setTitle(gameInfo.name)
//                     .setURL(`https://rawg.io/games/${gameInfo.slug}`)  // Link đến trang RAWG của game
//                     .setDescription(gameInfo.description_raw ? gameInfo.description_raw.substring(0, 200) + '...' : 'Không có mô tả.')
//                     .addFields(
//                         { name: 'Ngày phát hành', value: gameInfo.released || 'Không có thông tin', inline: true },
//                         { name: 'Xếp hạng', value: `${gameInfo.rating || 'Không có'} / 5`, inline: true },
//                         { 
//                             name: 'Nền tảng', 
//                             value: `${gameInfo.platforms ? gameInfo.platforms.map(p => p.platform.name).join(', ') : 'Không có'}`, 
                             
//                         },
//                     )
//                     .setImage(gameInfo.background_image)  // Ảnh bìa của game
                    

//                 // Gửi Embed vào kênh Discord
//                 message.channel.send({ embeds: [gameEmbed] });
//             } else {
//                 message.channel.send('Không tìm thấy game nào.');
//             }
//         } catch (error) {
//             message.channel.send('Có lỗi xảy ra khi tìm kiếm thông tin game.');
//         }
//     }
// });

// Đăng nhập vào bot bằng token Discord của bạn
client.login(discordToken);
