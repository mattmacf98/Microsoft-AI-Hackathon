import React from 'react';
import {Col, Container, Row} from "react-bootstrap";
import {Viewer} from "./components/Viewer";
import {ChatPane} from "./components/ChatPane";
import "./css/app.css";

export const App = () => {
  return (
      <Container className={"app-container no-gutters"}>
          <Row style={{height: "90%"}}>
              <Col xs={9}>
                  <Viewer/>
              </Col>
              <Col xs={3}>
                  <ChatPane/>
              </Col>
          </Row>
      </Container>
  );
}
