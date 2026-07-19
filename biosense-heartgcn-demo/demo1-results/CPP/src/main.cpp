#include "main_window.h"
#include "heartgcn/model.h"
#include <QApplication>
#include <iostream>
int main(int argc,char**argv){if(argc==2&&std::string(argv[1])=="--validate"){auto t=heartgcn::runValidationSuite();int p=0;for(auto&x:t){std::cout<<(x.passed?"PASS: ":"FAIL: ")<<x.name<<'\n';p+=x.passed;}std::cout<<"Summary: "<<p<<'/'<<t.size()<<" passed\n";return p==(int)t.size()?0:1;}if(argc==3&&std::string(argv[1])=="--export"){std::string e;if(!heartgcn::exportArtifacts(argv[2],&e)){std::cerr<<"Export failed: "<<e<<'\n';return 2;}std::cout<<"Exported artifacts to "<<argv[2]<<'\n';return 0;}QApplication app(argc,argv);MainWindow w;w.show();return app.exec();}
