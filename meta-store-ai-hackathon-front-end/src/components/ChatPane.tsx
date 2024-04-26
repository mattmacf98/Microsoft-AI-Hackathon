import "../css/app.css";
import {useEffect, useRef, useState} from "react";

enum ChatType {
    USER,
    AGENT
}
interface ChatMessage {
    chatType: ChatType,
    content: string
}

interface IChatPaneProps {
    sessionId: string
}
export const ChatPane = (props: IChatPaneProps) => {
    const [lastMessageTime, setLastMessageTime] = useState(0);
    const messages = useRef<ChatMessage[]>([]);
    const chatMessagesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatMessagesRef.current) {
            chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
    }, [lastMessageTime])

    const handleKeyPress = (event: any) => {
        if (event.key === 'Enter') {
            messages.current.push({chatType: ChatType.USER, content: event.target.value});
            setLastMessageTime(Math.random());
            callAI(event.target.value)
                .then(res => {
                    if (res.functionToInvoke) {
                        console.log(`INVOKING CUSTOM EVENT ${res.functionToInvoke}`);
                    }
                    messages.current.push({chatType: ChatType.AGENT, content: res.text});
                    setLastMessageTime(Math.random());
                })
            event.target.value = "";
        }
    };

    const callAI = async (prompt: string): Promise<AgentMessage> => {
        const body = {
            prompt: prompt,
            productContext: "The User has loaded a new product, here is some context: it is a red bicycle for children, it features advanced breaking and it costs $499 FUNTIONS: [show_blue_varaint, demonstrate_safe_break]",
            session_id: props.sessionId
        };
        try {
            const result = await fetch("http://localhost:4000/ai", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            const responseJson = await result.json();

            // const responseJson = {message: "Yes! We have a blue variant of this bicycle. INVOKE: show_blue_variant"}
            // const responseJson = {message: "Ok cool"}
            const parsedAgentMessage: AgentMessage = parseAIMessage(responseJson.message);
            console.log(parsedAgentMessage);
            return parsedAgentMessage;
        } catch (e: any) {
            console.error(e);
            return e.toString();
        }
    }

    interface AgentMessage {
        text: string,
        functionToInvoke?: string
    }
    const parseAIMessage = (message: string): AgentMessage => {
        const responseParts = message.split("INVOKE:");
        const text = responseParts[0].trim();
        const functionToInvoke = responseParts.length > 1 ? responseParts[1].trim() : undefined;
        return {
            text: text,
            functionToInvoke: functionToInvoke
        }
    }

    return (
        <div className={"chat-pane-container"}>
            <p style={{color: "white", fontSize: 1}}>{lastMessageTime}</p>
            <div className={"chat-messages"} ref={chatMessagesRef}>
                {messages.current.map((message, index) => {
                    switch (message.chatType) {
                        case ChatType.AGENT:
                            return <AgentMessageComponent text={message.content} key={index}/>
                        case ChatType.USER:
                            return <UserMessageComponent text={message.content} key={index}/>
                        default:
                            return null;
                    }
                })}
            </div>
            <div className="input-wrapper">
                <input type="text" className="styled-input" placeholder="Enter text..."  onKeyPress={handleKeyPress}/>
            </div>
        </div>
    )
}

export const AgentMessageComponent = (props: {text:string}) => {
    return (
        <div className={"agent-message"}>
            <p>
                {props.text}
            </p>
        </div>
    )
}

export const UserMessageComponent = (props: {text:string}) => {
    return (
        <div className={"user-message"}>
            <p>
                {props.text}
            </p>
        </div>
    )
}
