---
title: QGControl 图像获取
date: 2024-12-4 10:38:16
tags:
    - C++
categories:
    - C++
cover: https://picture.fanfer.top/Test_pics/IMG_5022.JPG
top_img: /assets/background.JPG
---

# Documentation

# 图像相关

> 📘 ImageProtocolManager是一个用于处理MAVLink图像传输协议的类，主要用于接收和处理来自光流相机等设备的图像数据。以下是其主要工作流程：
> 

### 1. 基本组成

- 两个主要成员变量：
    - `_imageHandshake`: 存储图像传输握手信息
    - `_imageBytes`: 存储接收到的图像数据

### 2. 图像接收流程

1. **握手阶段**

```cpp
case MAVLINK_MSG_ID_DATA_TRANSMISSION_HANDSHAKE:
```

- 接收`DATA_TRANSMISSION_HANDSHAKE`消息
- 清空之前的图像数据
- 记录新图像的基本信息（类型、宽度、高度等）
1. **数据传输阶段**

```cpp
case MAVLINK_MSG_ID_ENCAPSULATED_DATA:
```

- 接收`ENCAPSULATED_DATA`消息
- 根据序号(`seqnr`)将数据放入正确的位置
- 通过`_imageHandshake.packets`计数追踪传输完成情况
- 当所有数据包接收完成时，发出`imageReady`信号
1. **图像获取**

```cpp
QImage ImageProtocolManager::getImage(void)
```

支持多种图像格式：

- RAW8U/RAW32U：构建PGM格式
- BMP/JPEG/PGM/PNG：直接加载
- 返回QImage对象

### 3. 使用示例

假设您要在代码中使用这个类：

```cpp
// 创建实例
ImageProtocolManager* imageManager = new ImageProtocolManager();

// 连接信号
connect(imageManager, &ImageProtocolManager::imageReady, this, [=]() {
    QImage image = imageManager->getImage();
    // 处理接收到的图像
});

// 接收MAVLink消息时
void onMavlinkMessageReceived(mavlink_message_t message) {
    imageManager->mavlinkMessageReceived(message);
}

```

### 4. 错误处理

该类包含多个错误检查：

- 检查是否有未完成的前序传输
- 验证数据包序号是否有效
- 检查图像数据完整性
- 支持的图像格式验证

### 5. 注意事项

- 图像传输必须按照顺序：先握手，后数据
- 在调用`getImage()`之前确保图像传输完成
- 支持多种图像格式，但对于RAW格式需要特殊处理

这个类的设计遵循了MAVLink图像传输协议规范

1. **ImageProtocolManager的局限性**
- ImageProtocolManager只是一个接收和处理图像数据的工具
- 它不能主动触发拍照操作
- 它只负责接收和处理MAVLink传输的图像数据
1. **正确的拍照流程**

```cpp
class PhotoCapture : public QObject {
public:
    PhotoCapture(Vehicle* vehicle) {
        // 1. 创建相机控制器（用于触发拍照）
        _cameraControl = vehicle->cameraManager()->currentCameraInstance();

        // 2. 创建图像接收器（用于接收图像数据）
        _imageManager = new ImageProtocolManager();

        // 3. 连接vehicle的消息到图像管理器
        connect(vehicle, &Vehicle::mavlinkMessageReceived,
                _imageManager, &ImageProtocolManager::mavlinkMessageReceived);

        // 4. 处理接收到的图像
        connect(_imageManager, &ImageProtocolManager::imageReady,
                this, &PhotoCapture::handleImageReceived);
    }

    void capturePhoto() {
        if (_cameraControl) {
            _cameraControl->takePhoto();  // 触发拍照
        }
    }

private slots:
    void handleImageReceived() {
        QImage image = _imageManager->getImage();
        if (!image.isNull()) {
            QString filename = QString("photo_%1.jpg")
                .arg(QDateTime::currentDateTime().toString("yyyyMMdd_hhmmss"));
            image.save(filename);
        }
    }

private:
    QGCCameraControl* _cameraControl;
    ImageProtocolManager* _imageManager;
};

```

1. **为什么需要相机控制**
- 相机需要接收拍照命令才会开始拍照
- 相机控制器处理相机的状态和参数设置
- 相机控制器提供拍照反馈和状态更新
1. **完整的最小实现**

```cpp
// 最简单的拍照实现
class MinimalPhotoCapture : public QObject {
public:
    MinimalPhotoCapture(Vehicle* vehicle) : _vehicle(vehicle) {
        // 设置图像接收器
        _imageManager = new ImageProtocolManager();

        // 连接必要的信号
        connect(_vehicle, &Vehicle::mavlinkMessageReceived,
                _imageManager, &ImageProtocolManager::mavlinkMessageReceived);

        connect(_imageManager, &ImageProtocolManager::imageReady,
                this, &MinimalPhotoCapture::onImageReady);
    }

    void takePhoto() {
        // 必须通过相机控制发送拍照命令
        if (auto camera = _vehicle->cameraManager()->currentCameraInstance()) {
            camera->takePhoto();
        }
    }

private slots:
    void onImageReady() {
        // 保存接收到的图像
        QImage image = _imageManager->getImage();
        if (!image.isNull()) {
            image.save("captured_photo.jpg");
            qDebug() << "Photo saved successfully";
        }
    }

private:
    Vehicle* _vehicle;
    ImageProtocolManager* _imageManager;
};

```

1. **使用示例**

```cpp
// 使用方法
Vehicle* vehicle = ...;  // 获取vehicle实例
MinimalPhotoCapture* photoCapture = new MinimalPhotoCapture(vehicle);

// 拍照
photoCapture->takePhoto();

```

所以总结来说：

- 不能只使用ImageProtocolManager来完成拍照
- 需要通过相机控制器发送拍照命令
- ImageProtocolManager负责接收和处理图像数据
- 两者配合才能完成完整的拍照流程

建议：

1. 如果只需要简单拍照功能，可以使用上面的MinimalPhotoCapture实现
2. 如果需要更多相机控制功能（如设置参数、模式等），则使用完整的相机控制系统
3. 始终需要同时使用相机控制和ImageProtocolManager

# 多智能体

MultiVehicleManager是一个核心管理类，负责管理和协调多个车辆(Vehicle)。

### 1. 核心功能

1. **车辆管理**

```cpp
class MultiVehicleManager : public QGCTool {
private:
    QList<Vehicle*>    _vehicles;           // 管理所有车辆
    Vehicle*           _activeVehicle;      // 当前活动车辆
    bool              _activeVehicleAvailable;
};

```

1. **通信管理**

```cpp
void MultiVehicleManager::_sendGCSHeartbeat(void) {
    // 向所有连接的车辆发送心跳包
    for (int i=0; i<sharedLinks.count(); i++) {
        LinkInterface* link = sharedLinks[i].get();
        if (link->isConnected()) {
            mavlink_message_t message;
            mavlink_msg_heartbeat_pack_chan(...);
            link->writeBytesThreadSafe((const char*)buffer, len);
        }
    }
}

```

1. **编队控制协调**

```cpp
void MultiVehicleManager::_mainWork(void) {
    // 处理不同编队模式
    switch(bs_multi_model) {
        case Single:
            // 单船模式
            break;
        case Multi8:
            // 多船编队模式
            if(multi_start_flag) {
                // 收集所有船只信息
                for(int i = 0; i<_vehicles.count(); i++) {
                    Vehicle *v = qobject_cast<Vehicle*>(_vehicles[i]);
                    LBAgent agent;
                    agent.id = v->id();
                    agent.lat = v->lat;
                    agent.lon = v->lon;
                    // ... 其他参数
                    _allagent.push_back(agent);
                }

                // 执行编队控制
                vector<LBActor> all_actor =
                    _multiAgentController.FaultFormationControl2(_allagent, formation_gap);

                // 分发控制指令
                for(int i = 0; i<_vehicles.count(); i++) {
                    Vehicle *v = qobject_cast<Vehicle*>(_vehicles[i]);
                    v->receiveMultiParameters(control_data);
                }
            }
            break;
    }
}

```

### 2. 关键职责

1. **状态管理**

```cpp
// 管理各种控制模式标志
bool _manipulate_connect_flag;  // 操控模式
bool _logic_connect_flag;       // 逻辑模式
bool _virtual_connect_flag;     // 虚拟模式
bool multi_start_flag;          // 编队启动标志

```

1. **任务协调**

```cpp
void MultiVehicleManager::setMissionItems(const QList<MissionItem*>& items) {
    _allMissionItems = items;
    set_mission_flag = true;

    // 通知编队控制器
    vector<LBMission> missions;
    for(int i = 0; i<_allMissionItems.count(); i++) {
        MissionItem* item = _allMissionItems[i];
        LBMission mis;
        mis.lat = item->param5();
        mis.lon = item->param6();
        missions.push_back(mis);
    }
    _multiAgentController.MissionGet(missions);
}

```

1. **模式切换管理**

```cpp
void MultiVehicleManager::switchControlMode(ControlMode mode) {
    bs_control_model = mode;

    // 断开其他模式连接
    if(_manipulate_connect_flag) manipulateDisconnect();
    if(_logic_connect_flag) logicDisconnect();
    if(_virtual_connect_flag) virtualDisconnect();

    // 建立新模式连接
    switch(mode) {
        case Manipulate:
            manipulateConnect();
            break;
        case Logic:
            logicConnect();
            break;
        case Virtual:
            virtualConnect();
            break;
    }
}

```

### 3. 使用示例

1. **初始化多船系统**

```cpp
// 创建管理器
MultiVehicleManager* manager = new MultiVehicleManager(app, toolbox);

// 设置编队模式
manager->setMultiModel(Multi8);

// 设置控制模式
manager->setControlModel(Manipulate);

```

1. **执行编队任务**

```cpp
// 设置任务点
QList<MissionItem*> missionItems;
// ... 添加任务点
manager->setMissionItems(missionItems);

// 启动编队
manager->startMultiFormation();

```

### 4. 重要接口

1. **车辆管理接口**

```cpp
Vehicle* getVehicleById(int vehicleId);
Vehicle* activeVehicle();
QList<Vehicle*> vehicles();

```

1. **控制接口**

```cpp
void setMultiModel(MultiModel model);
void setControlModel(ControlModel model);
void startMultiFormation();
void stopMultiFormation();

```

1. **状态监控接口**

```cpp
bool isMultiFormationActive();
bool isVehicleAvailable();
void vehicleAdded(Vehicle* vehicle);
void vehicleRemoved(Vehicle* vehicle);

```

### 5. 注意事项

1. 确保所有车辆都已正确连接和初始化
2. 在切换模式前检查当前状态
3. 处理通信延迟和丢失情况
4. 保持心跳包的定期发送
5. 正确处理异常情况和错误恢复

MultiVehicleManager是整个多车辆系统的中枢，它协调各个子系统的工作，确保整个系统的正常运行。在进行编队控制时，它扮演着"指挥官"的角色，负责协调各个车辆的行动。

# 编队控制

### 1. 核心类的功能

1. **MultiAgentFormation**
- 作为编队控制的主要接口类
- 管理不同类型的编队控制器
- 提供多种编队模式的切换功能
1. **VSFormationControl**
- 实现基础的编队控制算法
- 支持多种编队形状（方形、C字型、纵排、三角形等）
- 处理目标点计算和速度控制

### 2. 编队模式

从代码中可以看到多种编队模式：

1. **基础编队模式** (VSFormationControl::VSFormationCalculate)

```cpp
switch(formationModel) {
    case 0: // 方形编队
    case 1: // C字型编队
    case 2: // 纵排编队
    case 3: // 三角形编队
}

```

1. **特殊编队模式**
- HUSTMoveFormation: 移动编队
- HUSTSearchFormation: 搜索编队
- HUSTExpelFormation: 驱离编队
- FaultFormation: 容错编队

### 3. 编队切换方法

要完成编队切换，需要：

1. **设置编队模式**

```cpp
// 在MultiVehicleManager中
if(bs_multi_model == Multi3) {  // 选择编队模式
    // 设置编队参数
    control_data.work_model = Mission;
    control_data.formation_flag = true;

    // 调用对应的编队控制器
    all_missions = _multiAgentController.HUSTMoveFormationControl(_allagent, formation_gap);
}

```

1. **切换步骤**

```cpp
// 1. 创建编队控制器
MultiAgentFormation _multiAgentController;

// 2. 设置任务点
vector<LBMission> missions;
// 添加任务点...
_multiAgentController.MissionGet(missions);

// 3. 选择编队模式并执行
// 例如切换到移动编队:
vector<vector<LBMission>> all_missions = _multiAgentController.HUSTMoveFormationControl(_allagent, formation_gap);

// 或切换到搜索编队:
all_missions = _multiAgentController.HUSTSearchFormationControl(_allagent, formation_gap);

```

### 4. 编队切换的关键参数

1. **控制标志**

```cpp
control_data.work_model    // 工作模式
control_data.work_state   // 工作状态
control_data.formation_flag // 编队标志

```

1. **编队参数**

```cpp
formation_gap  // 编队间距
refreshFlag    // 刷新标志
multi_start_flag // 编队启动标志

```

### 5. 实际使用示例

```cpp
// 切换到移动编队
void switchToMoveFormation() {
    // 1. 设置控制参数
    control_data.work_model = Mission;
    control_data.work_state = USVRun;
    control_data.formation_flag = true;

    // 2. 设置任务点
    if(set_mission_flag) {
        vector<LBMission> missions;
        // 添加任务点...
        _multiAgentController.MissionGet(missions);
    }

    // 3. 执行编队控制
    vector<vector<LBMission>> all_missions =
        _multiAgentController.HUSTMoveFormationControl(_allagent, formation_gap);

    // 4. 为每个船只分配任务
    for(int i = 0; i < _vehicles.count(); i++) {
        Vehicle *v = qobject_cast<Vehicle*>(_vehicles[i]);
        if(all_missions.size() > i) {
            v->MissionGet(convertToMissionItems(all_missions[i]));
        }
        v->receiveMultiParameters(control_data);
    }
}
```

# 直接通过grabImage()方法实现

可以直接使用VideoManager的grabImage()方法来获取图片。这个方法相对简单,不需要直接操作摄像头控制。

### 1. grabImage() 方法分析

```cpp
void VideoManager::grabImage(const QString& imageFile)
{
    // 1. 检查视频接收器是否可用
    if (!_videoReceiver[0] && !_videoReceiver[2]) {
        return;
    }

    // 2. 设置保存路径
    if (imageFile.isEmpty()) {
        // 使用默认路径和文件名
        _imageFile = qgcApp()->toolbox()->settingsManager()->appSettings()->photoSavePath();
        _imageFile += "/" + QDateTime::currentDateTime().toString("yyyy-MM-dd_hh.mm.ss.zzz") + ".jpg";
    } else {
        _imageFile = imageFile;
    }

    emit imageFileChanged();

    // 3. 捕获图像
    _videoReceiver[0]->takeScreenshot(_imageFile);
    _videoReceiver[2]->takeScreenshot(_imageFile);
}

```

### 2. 使用示例

```cpp
// 在MultiVehicleManager中添加拍照方法
void MultiVehicleManager::captureImage()
{
    VideoManager* videoManager = qgcApp()->toolbox()->videoManager();
    if (videoManager) {
        // 方式1: 使用默认路径
        videoManager->grabImage();

        // 方式2: 指定保存路径
        QString customPath = "path/to/your/photo.jpg";
        videoManager->grabImage(customPath);
    }
}

```

### 4. 使用注意事项

1. **确保视频流已启动**

```cpp
if (!videoManager->streaming()) {
    videoManager->startVideo();
}

```

1. **检查保存路径**

```cpp
QString photoPath = qgcApp()->toolbox()->settingsManager()->appSettings()->photoSavePath();
QDir dir(photoPath);
if (!dir.exists()) {
    dir.mkpath(".");
}

```

1. **处理错误情况**

```cpp
connect(videoManager, &VideoManager::imageFileChanged, this, [=]() {
    QString imageFile = videoManager->imageFile();
    if (QFile::exists(imageFile)) {
        qDebug() << "Image saved successfully:" << imageFile;
    } else {
        qWarning() << "Failed to save image";
    }
});

```

### 5. 建议的完整实现

```cpp
class PhotoCapture {
public:
    PhotoCapture() {
        _videoManager = qgcApp()->toolbox()->videoManager();
        connect(_videoManager, &VideoManager::imageFileChanged,
                this, &PhotoCapture::_handleImageCaptured);
    }

    void capturePhoto(const QString& customPath = QString()) {
        if (!_videoManager) return;

        // 确保视频流已启动
        if (!_videoManager->streaming()) {
            _videoManager->startVideo();
            // 等待视频流启动
            QTimer::singleShot(1000, this, [=]() {
                _videoManager->grabImage(customPath);
            });
        } else {
            _videoManager->grabImage(customPath);
        }
    }

private:
    void _handleImageCaptured() {
        QString imageFile = _videoManager->imageFile();
        if (QFile::exists(imageFile)) {
            emit photoCaptured(imageFile);
        } else {
            emit photoCaptureFailed();
        }
    }

    VideoManager* _videoManager;

signals:
    void photoCaptured(const QString& path);
    void photoCaptureFailed();
};

```

这种方式比直接控制相机要简单得多,适合只需要获取当前视频画面的场景。