var React = require('react');
var Navbar = require('./navbar')

class Layout extends React.Component {
  render() {
    return (
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>{this.props.title}</title>
          <link rel="stylesheet" href="/public/css/main.css" />
          <script dangerouslySetInnerHTML={{__html:`
            // This is making use of ES6 template strings, which allow for
            // multiline strings. We specified "{jsx: {harmony: true}}" when
            // creating the engine in app.js to get this feature.
            console.log("hello world");
          `}}/>
          <link href="https://fonts.googleapis.com/css?family=Raleway:300,400,500,600,700|Lato:300,400,500,700" rel="stylesheet" />
        </head>
        <body>
          <Navbar />
          <div className="containerFull">
            {this.props.children}
          </div>
        </body>
      </html>
    );
  }
}

Layout.propTypes = {
  title: React.PropTypes.string
};

module.exports = Layout;
