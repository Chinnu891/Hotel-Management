const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/backend',
    createProxyMiddleware({
      target: 'http://localhost',
      changeOrigin: true,
      secure: false,
      pathRewrite: {
        '^/backend': '/hotel-management/backend'
      }
    })
  );
};
