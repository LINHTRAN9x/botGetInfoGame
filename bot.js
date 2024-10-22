const { Client, GatewayIntentBits,REST, EmbedBuilder,Routes  } = require('discord.js');
const axios = require('axios');
require('dotenv').config();
const dns = require('dns');

// Thiết lập để chỉ sử dụng IPv4
dns.setDefaultResultOrder('ipv4first');


function estimateOwners(ownersRange) {
    const [minOwners, maxOwners] = ownersRange.split(' .. ').map(str => parseInt(str.replace(/,/g, '')));
    const averageOwners = (minOwners + maxOwners) / 2; 
    return averageOwners;
}

async function getSteamReviewData(appId) {
    const url = `https://steamspy.com/api.php?request=appdetails&appid=${appId}&`;

    try {
        const response = await axios.get(url);
        const data = response.data;
      
       

        const totalReviews = data.positive + data.negative; 
        const conversionRate = 0.05; 

        const ownersRange = data.owners;
        const estimatedOwners = estimateOwners(ownersRange);
        const priceInCents = data.price;
      
        const price = (priceInCents / 100).toFixed(2);
       
        const exchangeRate = 24000;
        const priceVND = price * exchangeRate;
        const estimatedRevenueUSD = estimatedOwners * price;
        const estimatedRevenueVND = estimatedRevenueUSD * exchangeRate;

        const languages = data.languages;
        const ccu = data.ccu;
        

       
        return { totalReviews,
                 priceVND,
                 estimatedRevenueVND,
                 ccu,
                 ownersRange,
                 languages,


               };
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu từ Steam:', error);
        return { totalReviews: 0, estimatedSales: 0 };
    }
}


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
    context.fillStyle = '#2A475E'; // Màu nền
    context.fillRect(0, 0, canvas.width, canvas.height); 

    // Lấy dữ liệu từ ratings
    const totalPositive = ratings.total_positive;
    const totalNegative = -ratings.total_negative;
    const totalReviews = ratings.total_reviews;

    // Dữ liệu để vẽ biểu đồ
    const labels = ['Tích cực', 'Tiêu cực']; // Nhãn trục x
    const data = [totalPositive, totalNegative]; // Dữ liệu cho trục y

    const backgroundColors = ['#66C0F4', '#A34C25']; 

    const chart = new Chart(context, {
        type: 'bar', // Loại biểu đồ
        data: {
            labels: labels, // Tên cột
            datasets: [{
                label: `Tổng đánh giá (${totalReviews} đánh giá)`, // Tiêu đề
                data: data, // Dữ liệu cho các cột
                backgroundColor: backgroundColors, // Màu sắc
                borderWidth: 1
            }]
        },
        options: {
            plugins: {
                tooltip: {
                    backgroundColor: '#2A475E',
                    titleFont: {
                        family: 'Roboto',
                        size: 16,
                        style: 'bold',
                        lineHeight: 1.2
                    },
                    bodyFont: {
                        family: 'Roboto',
                        size: 14,
                        lineHeight: 1.2
                    }
                },
            },
            scales: {
                y: {
                    beginAtZero: true, // Bắt đầu từ 0
                    ticks: {
                        color: '#64BDF0',
                        font: {
                            family: 'Roboto',
                            size: 14
                        }
                    },
                    grid: {
                        color: '#64BDF0'
                    },
                    title: {
                        display: true,
                        text: 'Số lượng',
                        color: '#64BDF0'
                    }
                },
                x: {
                    ticks: {
                        color: '#64BDF0',
                        font: {
                            family: 'Roboto',
                            size: 14
                        }
                    },
                    grid: {
                        color: '#64BDF0'
                    },
                    title: {
                        display: true,
                        text: 'Loại đánh giá',
                        color: '#64BDF0'
                    }
                }
            }
        }
    });

    return canvas.toBuffer(); 
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
            const steamGetGame = `https://steamcommunity.com/actions/SearchApps/${gameName}?json=1`
           

            try {
                await interaction.deferReply(); 
                const response = await axios.get(apiUrl);
                
                const gameInfo = response.data.results[0];  // Lấy game đầu tiên
                const rs = await axios.get(ggApiUrl);
                const data = rs.data;
                

                const rsSteam = await axios.get(steamGetGame);
                const gameSteam = rsSteam.data[0].appid;

                //Lấy giá từ Steam
                const getSteamData = await getSteamReviewData(gameSteam);
                
                

              


                const steamReviews = `https://store.steampowered.com/appreviews/${gameSteam}?json=1`;
                const rsSteamReviews = await axios.get(steamReviews);
                
                const steam = rsSteamReviews.data.query_summary;
                const steamReviewUser = rsSteamReviews.data.reviews[0].review;
                const steamPlayTime = rsSteamReviews.data.reviews[0].author.playtime_forever;

                if (gameInfo) {
                    const chartBuffer = await createChart(steam); // Tạo hình ảnh biểu đồ
                    const gameDes = data.itemListElement[0].result.detailedDescription.articleBody;
                    const wikiUrl = data.itemListElement[0].result.detailedDescription.url;
                    const tranlated = await translateWithMicrosoft(gameDes, 'vi');
                    const tranlatedReviewUser = await translateWithMicrosoft(steamReviewUser, 'vi');
                    
                

                    const embed = new EmbedBuilder()
                        .setColor('#0099ff')
                        .setTitle(gameInfo.name)
                        .setURL(`https://rawg.io/games/${gameInfo.slug}`)
                        .setDescription(tranlated ? tranlated : 'Không tìm thấy miêu tả.')
                        .addFields(
                            { name: 'Chi tiết', value: `${wikiUrl ? wikiUrl : 'Không có'}` },
                            { name: 'Ngày phát hành', value: formatDate(gameInfo.released) || 'Không có', inline: true },
                            { name: 'Điểm số', value: `${gameInfo.metacritic ? gameInfo.metacritic + " / 100" : gameInfo.rating + " / 5" || 'Không có'}`, inline: true },
                            { name: 'Đang chơi', value: `${getSteamData.ccu? getSteamData.ccu.toLocaleString() : "Không có"}người `, inline: true },
                            { name: 'Giá', value: `${getSteamData.priceVND? getSteamData.priceVND.toLocaleString() : "Không có"}đ `, inline: true },
                            { name: 'Số lượng đánh giá', value: `${getSteamData.totalReviews?getSteamData.totalReviews.toLocaleString() : "Không có"}người `, inline: true },
                            
                            { name: 'Doanh thu ước tính', value: `${getSteamData.estimatedRevenueVND?getSteamData.estimatedRevenueVND.toLocaleString():"Không có"}đ`, inline: true },
                            { name: 'Số lượng bán', value: `${getSteamData.ownersRange? getSteamData.ownersRange:"Không có"}`, inline: true },
                            { name: 'Ngôn ngữ', value: `${getSteamData.languages ? getSteamData.languages : 'Không có'}` },
                          
                            { name: 'Nền tảng', value: `${gameInfo.platforms ? gameInfo.platforms.map(p => p.platform.name).join(', ') : 'Không có'}` },
                            { name: 'Cửa hàng', value: `${gameInfo.stores ? gameInfo.stores.map(p => p.store.name).join(', ') : 'Không có'}` },
                            { name: `Bình luận tiêu biểu sau ${steamPlayTime}h chơi`, value: `${tranlatedReviewUser ? (tranlatedReviewUser.length > 1024 ? tranlatedReviewUser.substring(0, 1021) + '...' : tranlatedReviewUser) : 'Không có'}` },
                        );

                    if (gameInfo.genres && gameInfo.genres.length > 0) {
                        const genres = gameInfo.genres.map(genre => genre.name);
                        const primaryGenre = genres[0]; // Thể loại chính
                        const otherGenres = genres.slice(1).join(', '); // Gộp các thể loại còn lại
                        
                        embed.addFields(
                            { name: 'Thể loại chính', value: primaryGenre, inline: true },
                            { name: 'Các thể loại khác', value: otherGenres || 'Không có', inline: true }
                        );
                    }

                    embed.setImage('attachment://chart.png');

                    await interaction.followUp({ embeds: [embed], files: [{ name: 'chart.png', attachment: chartBuffer }] });
                } else {
                    await interaction.followUp('Không tìm thấy game nào.');
                }
            } catch (error) {
                await interaction.followUp('Có lỗi xảy ra khi tìm kiếm thông tin game.');
                console.error(error);
            }
        }
    }

    // Autocomplete phần game
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
