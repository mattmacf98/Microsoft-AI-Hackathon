import "../css/app.css";
import {useEffect, useRef, useState} from "react";
import {META_STORE_AI_BACKEND_URL} from "../App";

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
    const currentProductId = useRef<string | null>(null);

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
                    console.log(res);
                    if (res.functionToExecute) {
                        const ev = new CustomEvent("EXECUTE_FUNCTION", { detail: {id: res.functionToExecute} });
                        document.dispatchEvent(ev);
                    }
                    if (res.productToLoad) {
                        const ev = new CustomEvent("LOAD_NEW_PRODUCT", {detail: {id: res.productToLoad}});
                        currentProductId.current = res.productToLoad;
                        document.dispatchEvent(ev);
                    }
                    messages.current.push({chatType: ChatType.AGENT, content: res.message});
                    setLastMessageTime(Math.random());
                })
            event.target.value = "";
        }
    };

    const callAI = async (prompt: string): Promise<AgentMessage> => {
        const productContext = currentProductId.current !== null ? `The User has loaded a new product with ID ${currentProductId.current}` : "The User has not loaded any products"
        const body = {
            prompt: prompt,
            productContext: productContext,
            session_id: props.sessionId
        };
        try {
            const result = await fetch(`${META_STORE_AI_BACKEND_URL}/ai`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            const responseJson = await result.json();

            // const responseJson = {message: "Here is the blue variant of the bike you are interested in!", functionToExecute: "show_blue_variant"}
            // const responseJson = {message: "Ok cool", functionToExecute: null}
            console.log(responseJson);
            return responseJson;
        } catch (e: any) {
            console.error(e);
            return e.toString();
        }
    }

    interface AgentMessage {
        message: string,
        functionToExecute?: string,
        productToLoad?: string
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
