import fs from 'fs';
import axios from 'axios';
import * as colors from 'colors';
import * as readline from 'readline';
import 'colors';

interface Emoji {
    id: string;
    name: string;
    animated: boolean;
}

interface Guild {
    id: string;
    name: string;
}

interface Config {
    token: string;
    guildId: string;
}

const configFilePath = 'config.json';

function uhq(): Config {
    const configUHQ: Buffer = fs.readFileSync(configFilePath);
    return JSON.parse(configUHQ.toString());
}

function baka(config: Config): void {
    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 4));
}

function requete(): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(`L'ID du serveur Discord : `.yellow, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

async function main(): Promise<void> {
    const config = uhq();
    const { token } = config;

    const guildId = await requete();
    config.guildId = guildId;
    baka(config);

    const headers = { 'Authorization': token };

    let serverName = '';

    axios.get(`https://discord.com/api/v9/guilds/${guildId}`, { headers })
        .then((response) => {
            if (response.status !== 200) {
                throw new Error(`${response.status}: ${response.statusText}`);
            }
            const guild: Guild = response.data;
            serverName = guild.name;
        })
        .catch((error) => {
            console.error(`${error}`.red);
        })
        .finally(() => {
            const serverFolder = `./${serverName}`;
            if (!fs.existsSync(serverFolder)) {
                fs.mkdirSync(serverFolder);
            }

            axios.get(`https://discord.com/api/v9/guilds/${guildId}/emojis`, { headers })
                .then((response) => {
                    if (response.status !== 200) {
                        throw new Error(`${response.status}: ${response.statusText}`);
                    }
                    return response.data as Emoji[];
                })
                .then((emojis) => {
                    saTelechargeLesEmojis(emojis, serverFolder);
                })
                .catch((error) => {
                    console.error(`${error}`.red);
                });
        });
}

function saTelechargeLesEmojis(emojis: Emoji[], folderPath: string): void {
    emojis.forEach((emoji) => {
        const { name, id, animated } = emoji;
        const extension = animated ? 'gif' : 'png';
        const emojiName = `${name}.${extension}`;
        const url = `https://cdn.discordapp.com/emojis/${id}.${extension}`;
        const savePath = `${folderPath}/${emojiName}`;

        axios.get(url, { responseType: 'stream' })
            .then((response) => {
                const dest = fs.createWriteStream(savePath);
                response.data.pipe(dest);
                console.log(`Emoji : `.white + `${emojiName} `.yellow + `✔`.green);
            })
            .catch((error) => {
                console.error(`${emojiName} : ${error}`);
            });
    });
}

main().catch((error) => {
    console.error(`${error}`.red);
});