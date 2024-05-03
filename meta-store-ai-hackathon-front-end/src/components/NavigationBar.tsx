import {Nav, Navbar} from "react-bootstrap";

export const NavigationBar = () => {
    return (
        <Navbar expand="lg" className="px-4 py-2" style={{background: "#354665"}}>
            <Navbar.Brand href="#home" style={{color: "#ffffff"}}>Meta Store AI</Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
                <Nav className="mr-auto">
                    <Nav.Link href="#home" style={{color: "#ffffff"}}>Home</Nav.Link>
                </Nav>
            </Navbar.Collapse>
        </Navbar>
    );
}
