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

export const ChatPane = () => {
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
            callAI()
                .then(res => {
                    messages.current.push({chatType: ChatType.AGENT, content: res});
                    setLastMessageTime(Math.random());
                })
            event.target.value = "";
        }
    };

    const callAI = async (): Promise<string> => {
        return "ok"
    }

    return (
        <div className={"chat-pane-container"}>
            <p style={{color: "white", fontSize: 1}}>{lastMessageTime}</p>
            <div className={"chat-messages"} ref={chatMessagesRef}>
                {messages.current.map((message, index) => {
                    switch (message.chatType) {
                        case ChatType.AGENT:
                            return <AgentMessage text={message.content} key={index}/>
                        case ChatType.USER:
                            return <UserMessage text={message.content} key={index}/>
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

export const AgentMessage = (props: {text:string}) => {
    return (
        <div className={"agent-message"}>
            <p>
                {props.text}
            </p>
        </div>
    )
}

export const UserMessage = (props: {text:string}) => {
    return (
        <div className={"user-message"}>
            <p>
                {props.text}
            </p>
        </div>
    )
}
