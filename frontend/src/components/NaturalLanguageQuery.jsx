import React, { useState } from 'react';
import { Card, Input, Button, Table, Space, message, Tabs, Typography, Tag, Spin, Alert } from 'antd';
import { SearchOutlined, CodeOutlined, PlayCircleOutlined, LoadingOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { executeNaturalLanguageQuery, translateToSqlWithEvaluation, executeSqlQuery } from '../services/api';

const { TextArea } = Input;
const { TabPane } = Tabs;
const { Title, Text } = Typography;

const NaturalLanguageQuery = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [generatedSql, setGeneratedSql] = useState('');
  const [evaluation, setEvaluation] = useState('');
  const [activeTab, setActiveTab] = useState('result');
  const [sqlReady, setSqlReady] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showSqlReview, setShowSqlReview] = useState(false);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [sqlGenerating, setSqlGenerating] = useState(false);
  const [queryExecuting, setQueryExecuting] = useState(false);
  const [hasExecutedQuery, setHasExecutedQuery] = useState(false);
  const [executingAnimation, setExecutingAnimation] = useState(false);
  const [executionSuccess, setExecutionSuccess] = useState(false);

  // 将自然语言转换为SQL并生成评估
  const handleTranslateToSql = async () => {
    if (!query.trim()) {
      message.warning('请输入查询语句');
      return;
    }

    setLoading(true);
    setSqlGenerating(true);
    setShowSqlReview(false);
    setShowEvaluation(false);
    setSqlReady(false);
    try {
      console.log('转换为SQL:', query);
      const response = await translateToSqlWithEvaluation(query);
      console.log('转换结果:', response);
      if (response.success && response.data) {
        const { sql = '', evaluation = '' } = response.data;
        setGeneratedSql(sql);
        setEvaluation(evaluation);
        setActiveTab('sql');
        
        // 添加延迟，让动画效果更明显
        setTimeout(() => {
          setShowSqlReview(true);
        }, 300);
        
        // 添加延迟显示评估结果
        if (evaluation) {
          setTimeout(() => {
            setShowEvaluation(true);
          }, 600);
        }
        
        setSqlReady(true);
        message.success('SQL转换和评估成功，您可以查看并执行查询');
      } else {
        message.error(response.message || '转换失败');
      }
    } catch (error) {
      console.error('转换失败详细信息:', error);
      console.error('错误响应:', error.response);
      message.error('转换失败，请检查网络或服务器状态');
    } finally {
      setLoading(false);
      setSqlGenerating(false);
    }
  };

  // 执行SQL查询
  const handleExecuteQuery = async () => {
    if (!generatedSql && !query.trim()) {
      message.warning('请先输入查询语句并生成SQL');
      return;
    }

    setLoading(true);
    setQueryExecuting(true);
    setShowResults(false);
    setHasExecutedQuery(false);
    
    // 添加执行中动画状态
    setExecutingAnimation(true);
    
    try {
      console.log('执行查询:', query);
      
      let response;
      // 区分执行方式：如果已有生成的SQL，则执行该SQL；否则直接执行自然语言查询
      if (sqlReady && generatedSql) {
        console.log('执行已生成的SQL:', generatedSql);
        // 使用新的执行SQL API
        response = await executeSqlQuery(generatedSql, query);
      } else {
        console.log('直接执行自然语言查询:', query);
        // 使用旧的直接执行API
        response = await executeNaturalLanguageQuery(query);
      }
      
      console.log('查询结果:', response);
      if (response.success && response.data) {
        const { results = [], evaluation: executionEvaluation = '' } = response.data;
        setResults(results);
        
        // 如果执行结果有新的评估，更新评估
        if (executionEvaluation) {
          setEvaluation(executionEvaluation);
        }
        
        // 执行成功动画
        setExecutionSuccess(true);
        
        // 延迟切换到结果标签页，让用户看到执行成功动画
        setTimeout(() => {
          setActiveTab('result');
          
          // 添加延迟，让动画效果更明显
          setTimeout(() => {
            setShowResults(true);
            setHasExecutedQuery(true);
            setExecutionSuccess(false);
          }, 300);
        }, 500);
        
        message.success(results.length > 0 ? '查询成功，返回数据' : '查询成功，暂无数据');
      } else {
        setHasExecutedQuery(true);
        setExecutionSuccess(false);
        message.error(response.message || '查询失败');
      }
    } catch (error) {
      console.error('查询失败详细信息:', error);
      console.error('错误响应:', error.response);
      setHasExecutedQuery(true);
      setExecutionSuccess(false);
      message.error('查询失败，请检查SQL语法或网络状态');
    } finally {
      // 添加延迟关闭加载状态，确保动画完整显示
      setTimeout(() => {
        setLoading(false);
        setQueryExecuting(false);
        setExecutingAnimation(false);
      }, 500);
    }
  };

  // 表格列配置
  const getColumns = () => {
    if (results.length === 0) {
      return [];
    }

    // 动态生成列配置
    const firstRow = results[0];
    return Object.keys(firstRow).map(key => ({
      title: key,
      dataIndex: key,
      key: key,
      ellipsis: true,
      render: (text) => {
        if (typeof text === 'number') {
          return <Text strong>{text}</Text>;
        }
        return text;
      }
    }));
  };

  return (
    <Card 
      title="自然语言查询" 
      className="records-card"
      style={{ marginBottom: '20px' }}
    >
      {/* 添加动画样式 */}
      <style jsx>{`
        .fade-in {
          animation: fadeIn 0.5s ease-in-out;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .sql-container {
          background-color: #f6f8fa;
          padding: 16px;
          border-radius: 4px;
          fontFamily: 'monospace';
          position: relative;
          min-height: 150px;
          overflow-x: auto;
          white-space: pre-wrap;
          word-break: break-word;
        }
        
        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 40px;
          min-height: 200px;
        }
        
        .loading-content {
          text-align: center;
        }
        
        .sql-review-card {
          border: 2px solid #e6f7ff;
          border-radius: 8px;
          background-color: #f0f9ff;
          padding: 20px;
          margin-bottom: 16px;
        }
        
        .evaluation-card {
          background-color: #f6ffed;
          border: 1px solid #b7eb8f;
          border-radius: 4px;
          padding: 16px;
          margin-bottom: 16px;
          min-height: 150px;
          white-space: pre-wrap;
          word-break: break-word;
        }
        
        /* 执行动画样式 */
        .execution-animation {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1000;
          background-color: rgba(255, 255, 255, 0.95);
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 300px;
          animation: fadeInScale 0.3s ease-in-out;
        }
        
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        
        .execution-spinner {
          width: 60px;
          height: 60px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #1890ff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .execution-success {
          width: 60px;
          height: 60px;
          background-color: #52c41a;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          animation: successPulse 0.6s ease-in-out;
        }
        
        @keyframes successPulse {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .execution-success-icon {
          color: white;
          font-size: 32px;
        }
        
        .execution-text {
          font-size: 18px;
          font-weight: 600;
          color: #333;
          margin-bottom: 10px;
        }
        
        .execution-subtext {
          font-size: 14px;
          color: #666;
          text-align: center;
        }
      `}</style>
      
      {/* 执行动画组件 */}
      {(executingAnimation || executionSuccess) && (
        <div className="execution-animation">
          {executionSuccess ? (
            <>
              <div className="execution-success">
                <CheckCircleOutlined className="execution-success-icon" />
              </div>
              <div className="execution-text">查询执行成功</div>
              <div className="execution-subtext">正在跳转到结果页面...</div>
            </>
          ) : (
            <>
              <div className="execution-spinner"></div>
              <div className="execution-text">正在执行查询</div>
              <div className="execution-subtext">请稍候...</div>
            </>
          )}
        </div>
      )}
      
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div style={{ width: '100%' }}>
          <TextArea
            placeholder="请输入自然语言查询语句，例如：'查询所有部门的总请假小时数排行'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={3}
            style={{ marginBottom: '16px' }}
          />
          <Space>
            <Button 
              type="primary" 
              onClick={handleExecuteQuery}
              loading={loading}
              disabled={!sqlReady && !query.trim()}
              icon={<PlayCircleOutlined />}
              size="large"
              style={{ transition: 'all 0.3s ease' }}
            >
              {sqlReady ? '执行查询' : '直接执行'}
            </Button>
            <Button 
              onClick={handleTranslateToSql}
              loading={loading}
              icon={<CodeOutlined />}
              size="large"
              style={{ transition: 'all 0.3s ease' }}
            >
              生成SQL和评估
            </Button>
          </Space>
        </div>

        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          style={{ marginTop: '16px' }}
          tabBarStyle={{ marginBottom: '20px' }}
        >
          <TabPane tab="查询结果" key="result">
            {queryExecuting ? (
              <div className="loading-container">
                <div className="loading-content">
                  <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: '#1890ff' }} spin />} />
                  <p style={{ marginTop: '16px', fontSize: '16px', color: '#666' }}>正在执行查询，请稍候...</p>
                </div>
              </div>
            ) : hasExecutedQuery ? (
              results.length > 0 ? (
                <div className={showResults ? 'fade-in' : ''} style={{ opacity: showResults ? 1 : 0, transform: showResults ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.5s ease-in-out' }}>
                  <Table
                    columns={getColumns()}
                    dataSource={results.map((item, index) => ({ ...item, key: index }))}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 800 }}
                    loading={loading}
                  />
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#fff7e6', border: '1px solid #ffd591', borderRadius: '4px' }}>
                  <SearchOutlined style={{ fontSize: '48px', color: '#faad14' }} />
                  <p style={{ marginTop: '16px', color: '#fa8c16' }}>查询已执行，但未返回任何结果</p>
                  <p style={{ marginTop: '8px', color: '#fa8c16', fontSize: '12px' }}>请检查查询条件或尝试其他查询方式</p>
                </div>
              )
            ) : (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <SearchOutlined style={{ fontSize: '48px', color: '#ccc' }} />
                <p style={{ marginTop: '16px', color: '#999' }}>请输入查询语句并执行查询</p>
                <p style={{ marginTop: '8px', color: '#999', fontSize: '14px' }}>或点击"生成SQL和评估"先查看生成的SQL</p>
              </div>
            )}
          </TabPane>
          <TabPane tab="生成的SQL" key="sql">
            {sqlGenerating ? (
              <div className="loading-container">
                <div className="loading-content">
                  <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: '#1890ff' }} spin />} />
                  <p style={{ marginTop: '16px', fontSize: '16px', color: '#666' }}>正在生成SQL和评估，请稍候...</p>
                </div>
              </div>
            ) : generatedSql ? (
              <div className={showSqlReview ? 'fade-in' : ''} style={{ opacity: showSqlReview ? 1 : 0, transform: showSqlReview ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.5s ease-in-out' }}>
                <div className="sql-review-card">
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                      <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                      <Text strong>SQL生成成功，请检查后执行</Text>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <Title level={5} style={{ marginBottom: '8px' }}>生成的SQL</Title>
                      <div className="sql-container">
                        <pre>{generatedSql}</pre>
                      </div>
                    </div>
                    <Button 
                      type="primary" 
                      onClick={handleExecuteQuery}
                      loading={loading}
                      icon={<PlayCircleOutlined />}
                      size="large"
                      style={{ marginTop: '8px' }}
                    >
                      执行该SQL
                    </Button>
                  </div>
                </div>
                
                {evaluation && (
                  <div className={showEvaluation ? 'fade-in' : ''} style={{ opacity: showEvaluation ? 1 : 0, transform: showEvaluation ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.5s ease-in-out' }}>
                    <div className="evaluation-card">
                      <Title level={5} style={{ marginBottom: '8px', color: '#52c41a' }}>AI 分析评估</Title>
                      <Text>{evaluation}</Text>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <CodeOutlined style={{ fontSize: '48px', color: '#ccc' }} />
                <p style={{ marginTop: '16px', color: '#999' }}>请先输入查询语句，点击"生成SQL和评估"</p>
              </div>
            )}
          </TabPane>
          <TabPane tab="结果评估" key="evaluation">
            {queryExecuting ? (
              <div className="loading-container">
                <div className="loading-content">
                  <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: '#1890ff' }} spin />} />
                  <p style={{ marginTop: '16px', fontSize: '16px', color: '#666' }}>正在生成评估结果，请稍候...</p>
                </div>
              </div>
            ) : evaluation ? (
              <div className={showEvaluation ? 'fade-in' : ''} style={{ opacity: showEvaluation ? 1 : 0, transform: showEvaluation ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.5s ease-in-out' }}>
                <div className="evaluation-card">
                  <Title level={5} style={{ marginBottom: '8px', color: '#52c41a' }}>AI 分析结论</Title>
                  <Text>{evaluation}</Text>
                </div>
                {generatedSql && (
                  <div style={{ marginBottom: '16px' }}>
                    <Title level={5} style={{ marginBottom: '8px' }}>执行的SQL</Title>
                    <div className="sql-container">
                      <pre>{generatedSql}</pre>
                    </div>
                  </div>
                )}
              </div>
            ) : results.length > 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <CodeOutlined style={{ fontSize: '48px', color: '#ccc' }} />
                <p style={{ marginTop: '16px', color: '#999' }}>正在生成评估结果...</p>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <CodeOutlined style={{ fontSize: '48px', color: '#ccc' }} />
                <p style={{ marginTop: '16px', color: '#999' }}>暂无结果评估</p>
              </div>
            )}
          </TabPane>
        </Tabs>

        <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f0f5ff', borderRadius: '4px' }}>
          <Title level={5} style={{ marginBottom: '8px' }}>使用示例：</Title>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Tag color="blue">示例1</Tag>
              <Text> 查询所有部门的总请假小时数排行</Text>
            </div>
            <div>
              <Tag color="blue">示例2</Tag>
              <Text> 计算各部门的净加班小时数</Text>
            </div>
            <div>
              <Tag color="blue">示例3</Tag>
              <Text> 查询状态为待处理的异常工时记录数量</Text>
            </div>
            <div>
              <Tag color="blue">示例4</Tag>
              <Text> 找出连续工作天数最多的前5名员工</Text>
            </div>
          </Space>
        </div>
      </Space>
    </Card>
  );
};

export default NaturalLanguageQuery;