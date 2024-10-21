const { Client, GatewayIntentBits,REST, EmbedBuilder,Routes  } = require('discord.js');
const axios = require('axios');
require('dotenv').config();
const dns = require('dns');


dns.setDefaultResultOrder('ipv4first');

var discordToken = process.env.DISCORD_TOKEN;
var apiKey1 = process.env.API_KEY;
var appId = process.env.APP_ID
var appSecret = process.env.APP_SECRET;
var ggApiKeySecrec = process.env.GG_API_KEY; 
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
    const canvas = createCanvas(800, 400); 
    const context = canvas.getContext('2d');


    context.fillStyle = '#2A475E'; // Màu nền
    context.fillRect(0, 0, canvas.width, canvas.height); 


    const totalPositive = ratings.total_positive;
    const totalNegative = -ratings.total_negative;
    const totalReviews = ratings.total_reviews;

    
    const labels = ['Tích cực', 'Tiêu cực']; 
    const data = [totalPositive, totalNegative]; 

    const backgroundColors = ['#66C0F4', '#A34C25']; 

    const chart = new Chart(context, {
        type: 'bar', 
        data: {
            labels: labels,
            datasets: [{
                label: `Tổng đánh giá (${totalReviews} đánh giá)`, 
                data: data,
                backgroundColor: backgroundColors, 
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
                    beginAtZero: true, 
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






const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Bot online
client.once('ready', () => {
    console.log('Bot đã sẵn sàng!');
});


const rest = new REST({ version: '10' }).setToken(discordToken);

(async () => {
    try {
        console.log('Đang đăng ký (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(appId, appSecret), 
            { body: [
                {
                    name: 'game',
                    description: 'Tìm kiếm thông tin game',
                    options: [
                        {
                            name: 'tên',
                            description: 'Tên game',
                            type: 3,  
                            required: true,
                            autocomplete: true  
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
            const apiKey = apiKey1;  
            const apiUrl = `https://api.rawg.io/api/games?key=${apiKey}&search=${gameName}`;
            const steamGetGame = `https://steamcommunity.com/actions/SearchApps/${gameName}?json=1`

            try {
                await interaction.deferReply(); 
                const response = await axios.get(apiUrl);
                
                const gameInfo = response.data.results[0];  
                const rs = await axios.get(ggApiUrl);
                const data = rs.data;
                console.log("GOOGLE",data.itemListElement[0].result);

                const rsSteam = await axios.get(steamGetGame);
                
                const gameSteam = rsSteam.data[0].appid;
                
                const steamReviews = `https://store.steampowered.com/appreviews/${gameSteam}?json=1` 
                const rsSteamReviews = await axios.get(steamReviews);
                
                const steam = rsSteamReviews.data.query_summary;
                const steamReviewUser = rsSteamReviews.data.reviews[0].review;
                const steamPlayTime = rsSteamReviews.data.reviews[0].author.playtime_forever;
                
                
                
                

                if (gameInfo) {
                    const chartBuffer = await createChart(steam); 
                    const gameDes = data.itemListElement[0].result.detailedDescription.articleBody;
                    const wikiUrl = data.itemListElement[0].result.detailedDescription.url;
                    const tranlated = await translateWithMicrosoft(gameDes,'vi');
                    const tranlatedReviewUser = await translateWithMicrosoft(steamReviewUser,'vi');
                    
                    
                    
                    const embed = new EmbedBuilder()
                        .setColor('#0099ff')
                        .setTitle(gameInfo.name)
                        .setURL(`https://rawg.io/games/${gameInfo.slug}`)
                        .setDescription(tranlated? tranlated: 'Không tìm thấy miêu tả.')
                        .addFields(
                            { name: 'Chi tiết', value: `${wikiUrl  ? wikiUrl : 'Không có' }` },
                            { name: 'Ngày phát hành', value: formatDate(gameInfo.released)  || 'Không có', inline: true },
                            { name: 'Điểm số', value: `${gameInfo.metacritic ? gameInfo.metacritic+" / 100" : gameInfo.rating+" / 5" || 'Không có'}`, inline: true },
                           
                            { 
                                name: 'Nền tảng', 
                                value: `${gameInfo.platforms ? gameInfo.platforms.map(p => p.platform.name).join(', ') : 'Không có'}`, 
                            },
                            { 
                                name: 'Cửa hàng', 
                                value: `${gameInfo.stores ? gameInfo.stores.map(p => p.store.name).join(', ') : 'Không có'}`, 
                            },
                            { 
                                name: `Bình luận tiêu biểu sau ${steamPlayTime}h chơi`, 
                                value: `${tranlatedReviewUser ? (tranlatedReviewUser.length > 1024 ? tranlatedReviewUser.substring(0, 1021) + '...' : tranlatedReviewUser) : 'Không có'}`, 
                            },
                           

                        );
                      
                        if (gameInfo.genres && gameInfo.genres.length > 0) {
                            const genres = gameInfo.genres.map(genre => genre.name);
                        
                          
                            const primaryGenre = genres[0]; 
                            const otherGenres = genres.slice(1).join(', '); 
                        
                            embed.addFields(
                                { name: 'Thể loại chính', value: primaryGenre, inline: true },
                                { name: 'Các thể loại khác', value: otherGenres || 'Không có', inline: true }
                            );
                        }
                        
                        

                        embed.setImage('attachment://chart.png')
                   
                        // embed.setThumbnail(gameInfo.background_image); // Ảnh nền
                        

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
        const apiKey = apiKey1; 
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
    const endpoint = 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0'; 
    const location = 'southeastasia'; 

    const url = `${endpoint}&to=${targetLang}`;  

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
        return text;  
    }
}







client.login(discordToken);
