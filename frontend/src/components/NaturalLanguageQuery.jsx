import React, { useState } from 'react';
import { Card, Input, Button, Table, Space, message, Tabs, Typography, Tag } from 'antd';
import { SearchOutlined, CodeOutlined, PlayCircleOutlined } from '@ant-design/icons';
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

  // 执行自然语言查询
  const handleExecuteQuery = async () => {
    if (!query.trim()) {
      message.warning('请输入查询语句');
      return;
    }

    setLoading(true);
    try {
      const response = await executeNaturalLanguageQuery(query);
      if (response.success) {
        setResults(response.results || []);
        setActiveTab('result');
        message.success('查询成功');
      } else {
        message.error(response.message || '查询失败');
      }
    } catch (error) {
      message.error('查询失败，请检查网络或服务器状态');
    } finally {
      setLoading(false);
    }
  };

  // 将自然语言转换为SQL
  const handleTranslateToSql = async () => {
    if (!query.trim()) {
      message.warning('请输入查询语句');
      return;
    }

    setLoading(true);
    try {
      const response = await translateToSql(query);
      if (response.success) {
        setSql(response.sql || '');
        setActiveTab('sql');
        message.success('转换成功');
      } else {
        message.error(response.message || '转换失败');
      }
    } catch (error) {
      message.error('转换失败，请检查网络或服务器状态');
    } finally {
      setLoading(false);
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
            >
              执行查询
            </Button>
            <Button 
              onClick={handleTranslateToSql}
              loading={loading}
              icon={<CodeOutlined />}
              size="large"
            >
              转换为SQL
            </Button>
          </Space>
        </div>

        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          style={{ marginTop: '16px' }}
        >
          <TabPane tab="查询结果" key="result">
            {results.length > 0 ? (
              <Table
                columns={getColumns()}
                dataSource={results.map((item, index) => ({ ...item, key: index }))}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 800 }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <SearchOutlined style={{ fontSize: '48px', color: '#ccc' }} />
                <p style={{ marginTop: '16px', color: '#999' }}>暂无查询结果</p>
              </div>
            )}
          </TabPane>
          <TabPane tab="生成的SQL" key="sql">
            {sql ? (
              <div style={{ backgroundColor: '#f6f8fa', padding: '16px', borderRadius: '4px', fontFamily: 'monospace' }}>
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
