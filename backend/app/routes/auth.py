from flask import request, jsonify
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from datetime import datetime, timedelta
import sys
import os

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from models.user import User
from app import db

auth_ns = Namespace('auth', description='用户认证相关操作')

# 请求模型
login_model = auth_ns.model('Login', {
    'username': fields.String(required=True, description='用户名'),
    'password': fields.String(required=True, description='密码')
})

register_model = auth_ns.model('Register', {
    'username': fields.String(required=True, description='用户名'),
    'password': fields.String(required=True, description='密码'),
    'email': fields.String(description='邮箱')
})

# 响应模型
user_model = auth_ns.model('User', {
    'id': fields.Integer(description='用户ID'),
    'username': fields.String(description='用户名'),
    'email': fields.String(description='邮箱'),
    'role': fields.String(description='角色'),
    'is_active': fields.Boolean(description='是否激活'),
    'created_at': fields.String(description='创建时间'),
    'last_login': fields.String(description='最后登录时间')
})

login_response_model = auth_ns.model('LoginResponse', {
    'token': fields.String(description='访问令牌'),
    'user': fields.Nested(user_model, description='用户信息')
})

@auth_ns.route('/login')
class Login(Resource):
    @auth_ns.expect(login_model)
    @auth_ns.marshal_with(login_response_model)
    def post(self):
        """用户登录"""
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return {'error': '用户名和密码不能为空'}, 400
        
        user = User.get_by_username(username)
        if not user or not user.check_password(password):
            return {'error': '用户名或密码错误'}, 401
        
        if not user.is_active:
            return {'error': '账户已被禁用'}, 401
        
        # 更新最后登录时间
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # 创建访问令牌
        access_token = create_access_token(
            identity=user.id,
            expires_delta=timedelta(hours=1)
        )
        
        return {
            'token': access_token,
            'user': user.to_dict()
        }

@auth_ns.route('/register')
class Register(Resource):
    @auth_ns.expect(register_model)
    @auth_ns.marshal_with(user_model)
    def post(self):
        """用户注册"""
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        email = data.get('email')
        
        if not username or not password:
            return {'error': '用户名和密码不能为空'}, 400
        
        # 检查用户名是否已存在
        if User.get_by_username(username):
            return {'error': '用户名已存在'}, 400
        
        # 检查邮箱是否已存在
        if email and User.query.filter_by(email=email).first():
            return {'error': '邮箱已被使用'}, 400
        
        # 创建新用户
        user = User(
            username=username,
            email=email,
            role='user'
        )
        user.set_password(password)
        
        try:
            db.session.add(user)
            db.session.commit()
            return user.to_dict(), 201
        except Exception as e:
            db.session.rollback()
            return {'error': '注册失败'}, 500

@auth_ns.route('/profile')
class Profile(Resource):
    @jwt_required()
    @auth_ns.marshal_with(user_model)
    def get(self):
        """获取当前用户信息"""
        user_id = get_jwt_identity()
        user = User.get_by_id(user_id)
        
        if not user:
            return {'error': '用户不存在'}, 404
        
        return user.to_dict()
    
    @jwt_required()
    @auth_ns.expect(register_model)
    @auth_ns.marshal_with(user_model)
    def put(self):
        """更新用户信息"""
        user_id = get_jwt_identity()
        user = User.get_by_id(user_id)
        
        if not user:
            return {'error': '用户不存在'}, 404
        
        data = request.get_json()
        
        # 更新邮箱
        if 'email' in data:
            email = data['email']
            if email and email != user.email:
                existing_user = User.query.filter_by(email=email).first()
                if existing_user:
                    return {'error': '邮箱已被使用'}, 400
                user.email = email
        
        # 更新密码
        if 'password' in data and data['password']:
            user.set_password(data['password'])
        
        try:
            db.session.commit()
            return user.to_dict()
        except Exception as e:
            db.session.rollback()
            return {'error': '更新失败'}, 500

@auth_ns.route('/logout')
class Logout(Resource):
    @jwt_required()
    def post(self):
        """用户登出"""
        # 在实际应用中，这里可以将token加入黑名单
        return {'message': '登出成功'}

@auth_ns.route('/verify')
class Verify(Resource):
    @jwt_required()
    def get(self):
        """验证token有效性"""
        user_id = get_jwt_identity()
        user = User.get_by_id(user_id)
        
        if not user or not user.is_active:
            return {'error': 'Token无效'}, 401
        
        return {'valid': True, 'user_id': user_id}

