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
      <Container className={"no-gutters"}>
          <Row style={{height: 500, margin: "0 auto", padding: 128}}>
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
  );
}
