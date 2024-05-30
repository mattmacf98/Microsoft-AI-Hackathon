import React, {useEffect, useRef, useState} from 'react';
import {Col, Container, Row} from "react-bootstrap";
import {Viewer} from "./components/Viewer";
import {ChatPane} from "./components/ChatPane";
import "./css/app.css";
import {NavigationBar} from "./components/NavigationBar";

export const META_STORE_AI_BACKEND_URL="http://localhost:4000";

export const App = () => {
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);

  useEffect(() => {
      const alphabet = 'abcdefghijklmnopqrstuvwxyz';
      let randomString = '';
      for (let i = 0; i < 10; i++) {
          const randomIndex = Math.floor(Math.random() * alphabet.length);
          randomString += alphabet.charAt(randomIndex);
      }
      setSessionId(randomString);
  }, []);

  return (
      <>
          <NavigationBar/>
          <Container className={"no-gutters app-container"}>
              <Row style={{height: 600, margin: "0 auto"}} className={"agent-interaction-row"}>
                  <Col xs={9} style={{height: "inherit"}}>
                      <Viewer/>
                  </Col>
                  {
                      sessionId &&
                      <Col xs={3} style={{height: "inherit"}}>
                          <ChatPane sessionId={sessionId}/>
                      </Col>
                  }
              </Row>
          </Container>
      </>

  );
}
