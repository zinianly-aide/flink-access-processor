import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Table, Space, message, Tabs, Typography, Tag, Spin } from 'antd';
import { SearchOutlined, CodeOutlined, PlayCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { executeNaturalLanguageQuery, translateToSql } from '../services/api';

const { TextArea } = Input;
const { TabPane } = Tabs;
const { Title, Text } = Typography;

const NaturalLanguageQuery = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [sql, setSql] = useState('');
  const [activeTab, setActiveTab] = useState('result');
  const [showResults, setShowResults] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [sqlGenerating, setSqlGenerating] = useState(false);
  const [queryExecuting, setQueryExecuting] = useState(false);

  // 执行自然语言查询
  const handleExecuteQuery = async () => {
    if (!query.trim()) {
      message.warning('请输入查询语句');
      return;
    }

    setLoading(true);
    setQueryExecuting(true);
    setShowResults(false);
    try {
      console.log('执行查询:', query);
      const response = await executeNaturalLanguageQuery(query);
      console.log('查询结果:', response);
      if (response.success) {
        setResults(response.results || []);
        setActiveTab('result');
        // 添加延迟，让动画效果更明显
        setTimeout(() => {
          setShowResults(true);
        }, 300);
        message.success('查询成功');
      } else {
        message.error(response.message || '查询失败');
      }
    } catch (error) {
      console.error('查询失败详细信息:', error);
      console.error('错误响应:', error.response);
      message.error('查询失败，请检查网络或服务器状态');
    } finally {
      setLoading(false);
      setQueryExecuting(false);
    }
  };

  // 将自然语言转换为SQL
  const handleTranslateToSql = async () => {
    if (!query.trim()) {
      message.warning('请输入查询语句');
      return;
    }

    setLoading(true);
    setSqlGenerating(true);
    setShowSql(false);
    setSql('');
    
    // 添加打字机效果
    try {
      console.log('转换为SQL:', query);
      const response = await translateToSql(query);
      console.log('转换结果:', response);
      if (response.success) {
        const generatedSql = response.sql || '';
        setActiveTab('sql');
        
        // 打字机效果
        let currentSql = '';
        for (let i = 0; i < generatedSql.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 30));
          currentSql += generatedSql[i];
          setSql(currentSql);
        }
        
        setShowSql(true);
        message.success('转换成功');
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
      `}</style>
      
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
              icon={<PlayCircleOutlined />}
              size="large"
              style={{ transition: 'all 0.3s ease' }}
            >
              执行查询
            </Button>
            <Button 
              onClick={handleTranslateToSql}
              loading={loading}
              icon={<CodeOutlined />}
              size="large"
              style={{ transition: 'all 0.3s ease' }}
            >
              转换为SQL
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
            ) : results.length > 0 ? (
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
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <SearchOutlined style={{ fontSize: '48px', color: '#ccc' }} />
                <p style={{ marginTop: '16px', color: '#999' }}>暂无查询结果</p>
              </div>
            )}
          </TabPane>
          <TabPane tab="生成的SQL" key="sql">
            {sqlGenerating ? (
              <div className="loading-container">
                <div className="loading-content">
                  <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: '#1890ff' }} spin />} />
                  <p style={{ marginTop: '16px', fontSize: '16px', color: '#666' }}>正在生成SQL，请稍候...</p>
                </div>
              </div>
            ) : sql ? (
              <div className={showSql ? 'fade-in sql-container' : 'sql-container'} style={{ opacity: showSql ? 1 : 0, transform: showSql ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.5s ease-in-out' }}>
                <pre>{sql}</pre>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <CodeOutlined style={{ fontSize: '48px', color: '#ccc' }} />
                <p style={{ marginTop: '16px', color: '#999' }}>暂无生成的SQL</p>
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
