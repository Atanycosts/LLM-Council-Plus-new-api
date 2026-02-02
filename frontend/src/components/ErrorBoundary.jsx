import { Component } from 'react';

/**
 * 错误边界组件，用于优雅捕获并展示 React 运行时错误。
 * 避免单个组件异常导致整个应用崩溃。
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // 记录错误到控制台（可扩展为上报至监控服务）
    console.error('错误边界捕获到异常:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <h2>出现错误</h2>
            <p>发生了意外问题，请稍后重试。</p>
            {this.state.error && (
              <details className="error-details">
                <summary>错误详情</summary>
                <pre>{this.state.error.toString()}</pre>
                {this.state.errorInfo && (
                  <pre>{this.state.errorInfo.componentStack}</pre>
                )}
              </details>
            )}
            <button onClick={this.handleRetry} className="retry-button">
              重试
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
