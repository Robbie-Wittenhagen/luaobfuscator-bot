const {
    Client,
    GatewayIntentBits,
    PermissionsBitField,
    ActivityType,
    Partials,
    Colors,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    Collection
} = require("discord.js"),
    config = require("./.config.js"),
    fs = require("fs")

require("dotenv").config()

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel],
    fetchAllMembers: false
})

client.commands = new Collection()

fs.readdir("./commands", (err, files) => {
    if (err) throw err;

    files.forEach(f => {
        try {
            const props = require(`./commands/${f}`)
            client.commands.set(props.command, props)
        } catch (e) { console.error(e) }
    })
})

const commandList = require("./utils/commandList"),
    commandFunctions = require("./utils/command"),
    { createEmbed } = require("./utils/embed"),
    { getEmoji } = require("./utils/misc.js")

client.on("ready", async() => {
    const servers = client.guilds.cache.size

    setInterval(() => {
        const i = Math.floor(Math.random() * config.activities.length)
        client.user.setPresence({
            activities: [{
                name: `${config.activities[i]}`,
                type: ActivityType.Watching
            }],
            status: `${config.activities[i]}`
        })
    }, config.activity_update_interval || 5000)
    console.log(`Successfully logged in as ${client.user.tag}!\nListening to ${servers} servers.`)
})

client.on("messageCreate", async(message) => {
    if (message.author.bot) return
    if (!message.content) return
    try {
        if (commandFunctions.isCommand(message)) {
            const command = {
                cmd: commandFunctions.getCommand(message),
                args: commandFunctions.getArgs(message),
                rawargs: commandFunctions.getRawArgs(message),
                props: commandFunctions.getProps(message),
                message: message,
            }
            if (message.guild == null && !command.props.allow_dm || !command.props.enabled) return
            if (config.ignored_guilds.includes(message.guild.id)) {
                let error_embed = createEmbed({
                    description: `${getEmoji("delete")} Commands are currently disabled in this guild.`,
                    color: Colors.Red,
                })
                message.reply({ embeds: [error_embed] })
                return
            }
            if (command.props.required_permissions) {
                let allowed = false
                for (let i = 0; i < command.props.required_permissions.length; i++) {
                    const permission_bit = command.props.required_permissions[i];
                    if (commandFunctions.hasPermission(message.member, permission_bit)) allowed = true
                }
                if (!allowed) {
                    let embed = createEmbed({
                        title: `${getEmoji("failed")} Missing Permissions`,
                        color: Colors.Red,
                        description: "You are not allowed to use this command.",
                        timestamp: true
                    })
                    message.reply({ embeds: [embed] })
                    return
                }
            }
            let arg_length = command.props.arguments.length == 0 ? 0 : command.props.min_args || 0
            if (((command.args.length - 1) > arg_length || (command.args.length - 1) < arg_length) && (command.args.length - 1 < command.props.max_args) && !command.props.ignore_arguments) {
                let usage_args = command.props.arguments.length > 0 ? "`" + `${command.props.arguments}` + "`" : ""
                let usage_cmd = "`" + `${config.prefix}${command.cmd}` + "`"
                let embed = createEmbed({
                    title: `${getEmoji("failed")} Syntax Error`,
                    color: Colors.Red,
                    fields: [
                        { name: "Usage:", value: `${usage_cmd} ${usage_args}` }
                    ],
                    timestamp: true
                })
                message.reply({ embeds: [embed] })
                return
            }
            command.props.callback(command).then(() => {
                console.log(`'${command.cmd}' command requested by ${message.author.tag}`)
            })
        } else if (commandFunctions.isBotMention(message)) {
            const helpCommand = client.commands.find(cmd => cmd.command == "help")
            if (helpCommand) helpCommand.callback(message)
        }
    } catch (e) {
        console.error(e)
    }
})

client.on("interactionCreate", async(interaction) => {
    if (!interaction.isButton()) return

    try {} catch (e) {
        console.error(e)
    }
})

try {
    client.login(process.env.TOKEN).then(() => {
        console.info("Logging in...")
        global.client = client
    }).catch(console.error)
} catch (e) {
    console.error(e)
}