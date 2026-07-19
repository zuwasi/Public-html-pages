#include "main_window.h"
#include "visualization_widget.h"
#include "heartgcn/model.h"
#include <QDoubleSpinBox>
#include <QFileDialog>
#include <QFormLayout>
#include <QHBoxLayout>
#include <QLabel>
#include <QMessageBox>
#include <QPushButton>
#include <QSpinBox>
#include <QVBoxLayout>
MainWindow::MainWindow(){setWindowTitle("HeartGCN Synthetic / Harmonic Demonstrator");auto*c=new QWidget;auto*root=new QVBoxLayout(c);auto*note=new QLabel("Synthetic shortest-path wavefront + harmonic interpolation — not a trained clinical HeartGCN.");note->setStyleSheet("font-weight:bold;color:#8b1a1a");root->addWidget(note);auto*controls=new QHBoxLayout;nx_=new QSpinBox;ny_=new QSpinBox;source_=new QSpinBox;speed_=new QDoubleSpinBox;fraction_=new QDoubleSpinBox;noise_=new QDoubleSpinBox;nx_->setRange(2,50);ny_->setRange(2,50);nx_->setValue(12);ny_->setValue(9);source_->setRange(1,108);source_->setValue(1);speed_->setRange(.01,100);speed_->setValue(1);fraction_->setRange(.01,1);fraction_->setSingleStep(.05);fraction_->setValue(.25);noise_->setRange(0,100);noise_->setValue(.25);for(auto pair:{std::pair<QString,QWidget*>("NX",nx_),{"NY",ny_},{"Source (1-based)",source_},{"Speed",speed_},{"Sampling",fraction_},{"Noise σ",noise_}}){auto*f=new QFormLayout;f->addRow(pair.first,pair.second);controls->addLayout(f);}auto*runButton=new QPushButton("Run");auto*valButton=new QPushButton("Run Validation");auto*expButton=new QPushButton("Export…");controls->addWidget(runButton);controls->addWidget(valButton);controls->addWidget(expButton);root->addLayout(controls);status_=new QLabel("Ready");root->addWidget(status_);viz_=new VisualizationWidget;root->addWidget(viz_,1);setCentralWidget(c);resize(1050,650);connect(runButton,&QPushButton::clicked,this,[this]{run();});connect(valButton,&QPushButton::clicked,this,[this]{validate();});connect(expButton,&QPushButton::clicked,this,[this]{exportData();});connect(nx_,&QSpinBox::valueChanged,this,[this]{source_->setMaximum(nx_->value()*ny_->value());});connect(ny_,&QSpinBox::valueChanged,this,[this]{source_->setMaximum(nx_->value()*ny_->value());});run();}
void MainWindow::run(){try{auto e=heartgcn::syntheticWavefront(nx_->value(),ny_->value(),source_->value()-1,speed_->value());auto r=heartgcn::sparseReconstruction(e,fraction_->value(),noise_->value());status_->setText(QString("MAE: %1 | measured %2 / %3 | deterministic seed 42").arg(r.mae,0,'g',6).arg(r.measuredIndices.size()).arg(e.truth.size()));viz_->setResult(e,r);}catch(const std::exception&e){status_->setText(e.what());}}
void MainWindow::validate(){auto t=heartgcn::runValidationSuite();int n=0;QString detail;for(auto&x:t){n+=x.passed;detail+=QString::fromStdString(x.name)+": "+(x.passed?"PASS":"FAIL")+"\n";}QMessageBox::information(this,"Validation",QString("%1/%2 passed\n\n").arg(n).arg(t.size())+detail);}
void MainWindow::exportData(){auto d=QFileDialog::getExistingDirectory(this,"Select artifact output folder");if(d.isEmpty())return;std::string error;if(heartgcn::exportArtifacts(d.toStdString(),&error))status_->setText("Artifacts exported to "+d);else QMessageBox::critical(this,"Export failed",QString::fromStdString(error));}
