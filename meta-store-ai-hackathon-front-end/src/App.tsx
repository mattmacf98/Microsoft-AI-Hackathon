import React, {useEffect, useRef, useState} from 'react';
import {Col, Container, Row} from "react-bootstrap";
import {Viewer} from "./components/Viewer";
import {ChatPane} from "./components/ChatPane";
import "./css/app.css";

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
      <Container className={"app-container no-gutters"}>
          <Row style={{height: "90%"}}>
              <Col xs={9}>
                  <Viewer/>
              </Col>
              {
                  sessionId &&
                  <Col xs={3}>
                      <ChatPane sessionId={sessionId}/>
                  </Col>
              }
          </Row>
      </Container>
  );
}
