import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { CustomAttribute } from '../types/device';

interface AttributesEditorProps {
  attributes: CustomAttribute[];
  onSave: (attributes: CustomAttribute[]) => void;
  onCancel: () => void;
  isDarkMode: boolean;
  title: string;
}

const AttributesEditor: React.FC<AttributesEditorProps> = ({
  attributes = [],
  onSave,
  onCancel,
  isDarkMode,
  title
}) => {
  const [editingAttributes, setEditingAttributes] = useState<CustomAttribute[]>([...attributes]);
  const [newAttribute, setNewAttribute] = useState<Partial<CustomAttribute>>({
    name: '',
    value: '',
    type: 'string'
  });

  // 添加新属性
  const handleAddAttribute = () => {
    if (!newAttribute.name) return;
    
    const newId = `attr-${Date.now()}`;
    let value: string | number = newAttribute.value as string;
    
    // 如果类型是数字，确保值是数字
    if (newAttribute.type === 'number') {
      value = parseFloat(value as string) || 0;
    }
    
    const attribute: CustomAttribute = {
      id: newId,
      name: newAttribute.name,
      value,
      type: newAttribute.type as 'string' | 'number'
    };
    
    setEditingAttributes([...editingAttributes, attribute]);
    setNewAttribute({ name: '', value: '', type: 'string' });
  };

  // 更新现有属性
  const handleUpdateAttribute = (index: number, field: keyof CustomAttribute, value: any) => {
    const updatedAttributes = [...editingAttributes];
    
    if (field === 'type') {
      // 如果类型从字符串变为数字，确保值是数字
      if (value === 'number') {
        updatedAttributes[index].value = parseFloat(updatedAttributes[index].value as string) || 0;
      }
      // 如果类型从数字变为字符串，确保值是字符串
      else if (value === 'string') {
        updatedAttributes[index].value = String(updatedAttributes[index].value);
      }
    }
    
    // 如果更新的是值字段，根据当前类型处理
    if (field === 'value') {
      if (updatedAttributes[index].type === 'number') {
        value = parseFloat(value) || 0;
      }
    }
    
    updatedAttributes[index][field] = value;
    setEditingAttributes(updatedAttributes);
  };

  // 删除属性
  const handleDeleteAttribute = (index: number) => {
    const updatedAttributes = [...editingAttributes];
    updatedAttributes.splice(index, 1);
    setEditingAttributes(updatedAttributes);
  };

  // 保存所有属性
  const handleSave = () => {
    onSave(editingAttributes);
  };

  // 防止事件冒泡到背景
  const handleDialogClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // 创建一个弹窗，渲染到document.body上，避免受到ReactFlow缩放的影响
  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
      onClick={onCancel}
    >
      <div 
        className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} rounded-lg p-6 max-w-2xl w-full mx-4 shadow-xl`}
        style={{ maxHeight: '80vh' }}
        onClick={handleDialogClick}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{title || '编辑属性'}</h2>
          <button 
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 现有属性列表 */}
        {editingAttributes.length > 0 && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">现有属性</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {editingAttributes.map((attr, index) => (
                <div 
                  key={attr.id} 
                  className={`grid grid-cols-10 gap-2 p-2 rounded-md ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                  }`}
                >
                  <div className="col-span-3">
                    <input
                      type="text"
                      value={attr.name}
                      onChange={(e) => handleUpdateAttribute(index, 'name', e.target.value)}
                      className={`w-full px-2 py-1 rounded ${
                        isDarkMode 
                          ? 'bg-gray-600 text-white border-gray-500' 
                          : 'bg-white text-gray-800 border-gray-300'
                      } border`}
                      placeholder="属性名称"
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      type={attr.type === 'number' ? 'number' : 'text'}
                      value={attr.value.toString()}
                      onChange={(e) => handleUpdateAttribute(index, 'value', e.target.value)}
                      className={`w-full px-2 py-1 rounded ${
                        isDarkMode 
                          ? 'bg-gray-600 text-white border-gray-500' 
                          : 'bg-white text-gray-800 border-gray-300'
                      } border`}
                      placeholder="属性值"
                    />
                  </div>
                  <div className="col-span-2">
                    <select
                      value={attr.type}
                      onChange={(e) => handleUpdateAttribute(index, 'type', e.target.value)}
                      className={`w-full px-2 py-1 rounded ${
                        isDarkMode 
                          ? 'bg-gray-600 text-white border-gray-500' 
                          : 'bg-white text-gray-800 border-gray-300'
                      } border`}
                    >
                      <option value="string">字符串</option>
                      <option value="number">数值</option>
                    </select>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button
                      onClick={() => handleDeleteAttribute(index)}
                      className="text-red-500 hover:text-red-700"
                      title="删除属性"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 添加新属性 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">添加新属性</h3>
          <div className={`grid grid-cols-10 gap-2 p-2 rounded-md ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
            <div className="col-span-3">
              <input
                type="text"
                value={newAttribute.name}
                onChange={(e) => setNewAttribute({...newAttribute, name: e.target.value})}
                className={`w-full px-2 py-1 rounded ${
                  isDarkMode 
                    ? 'bg-gray-600 text-white border-gray-500' 
                    : 'bg-white text-gray-800 border-gray-300'
                } border`}
                placeholder="属性名称"
              />
            </div>
            <div className="col-span-4">
              <input
                type={newAttribute.type === 'number' ? 'number' : 'text'}
                value={newAttribute.value?.toString() || ''}
                onChange={(e) => setNewAttribute({...newAttribute, value: e.target.value})}
                className={`w-full px-2 py-1 rounded ${
                  isDarkMode 
                    ? 'bg-gray-600 text-white border-gray-500' 
                    : 'bg-white text-gray-800 border-gray-300'
                } border`}
                placeholder="属性值"
              />
            </div>
            <div className="col-span-2">
              <select
                value={newAttribute.type}
                onChange={(e) => setNewAttribute({...newAttribute, type: e.target.value as 'string' | 'number'})}
                className={`w-full px-2 py-1 rounded ${
                  isDarkMode 
                    ? 'bg-gray-600 text-white border-gray-500' 
                    : 'bg-white text-gray-800 border-gray-300'
                } border`}
              >
                <option value="string">字符串</option>
                <option value="number">数值</option>
              </select>
            </div>
            <div className="col-span-1 flex justify-center">
              <button
                onClick={handleAddAttribute}
                className="text-green-500 hover:text-green-700"
                title="添加属性"
                disabled={!newAttribute.name}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end mt-4 space-x-3">
          <button
            onClick={onCancel}
            className={`px-4 py-2 rounded ${
              isDarkMode 
                ? 'bg-gray-600 hover:bg-gray-500 text-white' 
                : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
            }`}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );

  // 使用Portal将对话框渲染到document.body上
  return ReactDOM.createPortal(modalContent, document.body);
};

export default AttributesEditor; 